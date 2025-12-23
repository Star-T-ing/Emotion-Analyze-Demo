<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// 导入 ECharts 相关模块
import { use } from 'echarts/core';
import { RadarChart, BarChart, LineChart, ScatterChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

// 注册 ECharts 组件
use([
  RadarChart,
  BarChart,
  LineChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent,
  VisualMapComponent,
  CanvasRenderer
]);

// --- 核心状态 ---
const userId = 'xiaoA-default-user-id-12345';
const conversationId = ref('');
const lastFinalizedConversationId = ref('');
const isLoading = ref(false);
const isFinalizing = ref(false);
const error = ref(null);

const currentMessageText = ref('');
const conversationLog = ref([]);
const conversationData = ref(null);
const messageHistory = ref([]);
const anomalies = ref({});
const profileData = ref(null);
const profileError = ref(null);

const dashboardView = ref('realtime'); // 'realtime' or 'profile'

// --- 反馈弹窗状态 ---
const showFeedbackModal = ref(false);
const feedbackRating = ref(0);
const feedbackComment = ref('');
const feedbackDimensions = ref({
  accuracy: 0,      // 回答准确性
  clarity: 0,       // 表达清晰度
  empathy: 0        // 情感共鸣
});

// --- 生命周期钩子 ---
onMounted(async () => {
  // 在组件挂载后，立即尝试获取用户画像
  await fetchUserProfile();
  // 然后再开启一个新对话
  initializeNewConversation(); 
});


async function fetchUserProfile() {
  // 在请求开始前，清空上一次的错误状态
  profileError.value = null;

  try {
    // 调用获取用户画像的 GET 接口
    const response = await axios.get(`http://127.0.0.1:8000/api/v1/profiles/${userId}`);
    
    // 请求成功，将返回的数据赋值给 profileData
    profileData.value = response.data;
    console.log("成功获取到已存在的用户画像:", response.data);

  } catch (err) {
    // 如果请求发生错误
    if (err.response && err.response.status === 404) {
      // 如果是 404 错误，说明画像还不存在，这是一个正常情况
      const message = "用户画像还不存在，将在第一次会话结束后创建。";
      profileError.value = message;
      console.log(message);
    } else {
      // 对于其他类型的错误（如网络问题、服务器500错误等）
      const message = "获取用户画像失败，请检查后端服务是否正常。";
      profileError.value = message;
      console.error("获取用户画像失败:", err);
    }
  }
}


function initializeNewConversation() {
  const newId = uuidv4();
  conversationId.value = newId;
  conversationLog.value = [{ type: 'system', text: `新对话已开始` }];
  conversationData.value = null;
  messageHistory.value = [];
  anomalies.value = {};
  error.value = null;
}


async function startNewConversation() {
  // 如果有消息历史，先显示反馈弹窗
  if (messageHistory.value.length > 0) {
    showFeedbackModal.value = true;
  } else {
    // 如果没有消息，直接开启新对话
    initializeNewConversation();
  }
}

async function submitFeedbackAndStartNew() {
  showFeedbackModal.value = false;
  isFinalizing.value = true;
  
  try {
    // 记录反馈数据（可以发送到后端）
    if (feedbackRating.value > 0) {
      console.log('用户反馈:', {
        conversationId: conversationId.value,
        rating: feedbackRating.value,
        dimensions: feedbackDimensions.value,
        comment: feedbackComment.value
      });
      // TODO: 可以在这里调用后端API保存反馈
      // await axios.post('http://127.0.0.1:8000/api/v1/feedback/', { ... });
    }
    
    if (
      conversationId.value &&
      messageHistory.value.length > 0 &&
      conversationId.value !== lastFinalizedConversationId.value
    ) {
      await finalizeConversation(conversationId.value);
    }
  } catch (err) {
    console.error("在开启新对话流程中，分析上一个会话失败:", err);
  } finally {
    // 重置反馈表单
    feedbackRating.value = 0;
    feedbackComment.value = '';
    feedbackDimensions.value = { accuracy: 0, helpfulness: 0, clarity: 0, empathy: 0 };
    initializeNewConversation();
    isFinalizing.value = false;
  }
}

function cancelFeedback() {
  showFeedbackModal.value = false;
  feedbackRating.value = 0;
  feedbackComment.value = '';
  feedbackDimensions.value = { accuracy: 0, helpfulness: 0, clarity: 0, empathy: 0 };
}


async function handleSendMessage() {
  if (!currentMessageText.value.trim() || isLoading.value) return;

  const textToSend = currentMessageText.value;
  conversationLog.value.push({ type: 'user', text: textToSend });
  currentMessageText.value = '';
  isLoading.value = true;
  error.value = null;
  scrollToBottom();

  try {
    const response = await axios.post('http://127.0.0.1:8000/api/v1/analysis/', {
      conversation_id: conversationId.value,
      user_id: userId,
      text: textToSend,
    });
    
    // 模拟大模型思考延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const { message, conversation, bot_response, anomalies: newAnomalies } = response.data;
    
    // 1. 先 push 一个空的占位对象
    conversationLog.value.push({ type: 'bot', text: '' });

    // 2. 从数组末尾获取那个刚刚被 Vue 包装过的、真正的响应式对象
    const reactiveBotLogEntry = conversationLog.value[conversationLog.value.length - 1];

    // 3. 将这个响应式对象传递给流式函数
    streamBotResponse(reactiveBotLogEntry, bot_response);

    conversationData.value = conversation;
    messageHistory.value.unshift(message);
    if (newAnomalies && newAnomalies.length > 0) {
      anomalies.value[message.message_id] = newAnomalies;
    }
  } catch (err) {
    const errorMessage = err.response?.data?.detail || err.message || '未知错误';
    error.value = `请求失败: ${errorMessage}`;
    conversationLog.value.push({ type: 'system', text: `[错误] ${error.value}` });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
}

async function finalizeConversation(convId) {
  // 如果传入的 convId 无效，则直接返回
  if (!convId) return;

  // 标记上一个被分析的会话ID，防止重复分析
  lastFinalizedConversationId.value = convId;
  
  // 在对话窗口显示一条系统提示，告知用户正在进行分析
  const finishingLog = { type: 'system', text: `正在结束并分析会话 ${convId.substring(0, 8)}...` };
  conversationLog.value.push(finishingLog);
  scrollToBottom();

  try {
    // 调用新的后端API接口
    // 使用 POST 方法，并将 conversation_id 放在请求体中
    const response = await axios.post(
      `http://127.0.0.1:8000/api/v1/profiles/${userId}/finalize_conversation`,
      {
        conversation_id: convId
      }
    );

    // 请求成功后，用后端返回的最新画像数据更新前端状态
    profileData.value = response.data;
    
    // 更新对话窗口中的系统提示，告知用户分析已完成
    finishingLog.text = `会话 ${convId.substring(0, 8)} 分析完成，用户画像已更新！`;

  } catch (err) {
    // 如果请求失败，记录详细错误到控制台
    console.error("结束会话失败:", err);
    
    // 同样更新系统提示，告知用户分析失败
    finishingLog.text = `[错误] 会话 ${convId.substring(0, 8)} 分析失败。`;
    
    // 重新抛出错误，以便顶层调用者(startNewConversation)的 try...catch 块可以捕获到
    throw err;
  }
}


const chatWindow = ref(null);
function scrollToBottom() {
  nextTick(() => {
    if (chatWindow.value) chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
  });
}

/**
 * 流式输出机器人回复，模拟打字机效果
 * @param {object} logEntry - 对话记录中对应的条目
 * @param {string} fullText - 完整的回复文本
 */
function streamBotResponse(logEntry, fullText) {
  let index = 0;
  const interval = setInterval(() => {
    if (index < fullText.length) {
      logEntry.text += fullText[index];
      index++;
      scrollToBottom();
    } else {
      clearInterval(interval);
    }
  }, 25); // 每个字 25 毫秒
}

// --- 雷达图计算属性 ---
const emotionProfileChartOption = computed(() => {
    if (!profileData.value || !profileData.value.emotion_distribution) return {};
    const dist = profileData.value.emotion_distribution;
    const total = Math.max(1, Object.values(dist).reduce((a, b) => a + b, 0));
    
    // 使用全部8种情感，设置更大的最大值以增加雷达图的形状
    const maxValue = 0.5; // 将最大值设为0.5，这样雷达图会更大
    const indicator = [
        { name: '兴奋', max: maxValue }, { name: '自信', max: maxValue }, { name: '好奇', max: maxValue },
        { name: '困惑', max: maxValue }, { name: '焦虑', max: maxValue }, { name: '沮丧', max: maxValue },
        { name: '愤怒', max: maxValue }, { name: '厌倦', max: maxValue }
    ];
    const data = [
      (dist['兴奋'] || 0) / total, (dist['自信'] || 0) / total, (dist['好奇'] || 0) / total,
      (dist['困惑'] || 0) / total, (dist['焦虑'] || 0) / total, (dist['沮丧'] || 0) / total,
      (dist['愤怒'] || 0) / total, (dist['厌倦'] || 0) / total
    ].map(v => parseFloat(v.toFixed(3)));

    return {
        title: { text: '情感特质分布', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'item' },
        radar: { indicator, shape: 'circle', center: ['50%', '55%'], radius: '65%' },
        series: [{ type: 'radar', data: [{ value: data, name: '情感倾向' }], areaStyle: { opacity: 0.4 } }]
    };
});

const learningStateChartOption = computed(() => {
    if (!profileData.value) return {};
    const p = profileData.value;
    const indicator = [
        { name: '投入度', max: 1 }, { name: '抗压力', max: 1 }, { name: '掌控感', max: 1 },
        { name: '唤醒度', max: 1 }, { name: '稳定性', max: 1 }
    ];
    const data = [
        p.engagement_index,
        1 - p.frustration_index,
        p.sentiment_baseline.avg_dominance,
        p.sentiment_baseline.avg_arousal,
        p.stability_baseline
    ].map(v => v.toFixed(3));
    
    return {
        title: { text: '认知状态模型', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'item' },
        radar: { indicator, shape: 'circle', center: ['50%', '55%'], radius: '65%' },
        series: [{ type: 'radar', data: [{ value: data, name: '认知状态' }], areaStyle: { opacity: 0.4 } }]
    };
});

const EMOTIONS = ['兴奋','自信','好奇','困惑','焦虑','沮丧','愤怒','厌倦'];
const EMOTION_COLOR_MAP = {
  '兴奋': '#FF6F00', // 亮橙
  '自信': '#0066FF', // 正蓝
  '好奇': '#8B00FF', // 亮紫
  '困惑': '#795548', // 深棕
  '焦虑': '#B71C1C', // 深红
  '沮丧': '#424242', // 深灰
  '愤怒': '#FF1744', // 鲜红
  '厌倦': '#9E9E9E'  // 中灰
};

const peakSentimentChartOption = computed(() => {
  if (!conversationData.value || !conversationData.value.peak_sentiment) return {};
  const ps = conversationData.value.peak_sentiment;
  const pos = ps.positive?.valence ?? 0;
  const neg = ps.negative?.valence ?? 0;
  
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e8d5c4',
      borderWidth: 1,
      textStyle: { color: '#4e342e', fontSize: 13 },
      formatter: (params) => {
        const p = params[0];
        const val = p.name === '积极峰值' ? pos : neg;
        const label = p.name === '积极峰值' ? '最积极时刻' : '最消极时刻';
        return `<div style="padding:4px 6px;">
          <div style="font-weight:600;margin-bottom:4px;">${label}</div>
          <div style="font-size:13px;">愉悦度: <b style="color:${p.name === '积极峰值' ? '#66bb6a' : '#ef5350'}">${val.toFixed(3)}</b></div>
        </div>`;
      }
    },
    grid: { left: 70, right: 40, top: 20, bottom: 20 },
    xAxis: { 
      type: 'value', 
      min: -1, 
      max: 1,
      axisLabel: { 
        show: true,
        fontSize: 12,
        color: '#8d6e63',
        formatter: (val) => val.toFixed(1)
      },
      axisLine: { show: true, lineStyle: { color: '#e8d5c4' } },
      splitLine: { show: true, lineStyle: { color: '#f5f5f5', type: 'dashed' } }
    },
    yAxis: { 
      type: 'category', 
      data: ['消极峰值', '积极峰值'],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { 
        color: '#6d4c41',
        fontSize: 13,
        fontWeight: 500
      }
    },
    series: [{
      type: 'bar',
      barWidth: 24,
      label: {
        show: true,
        position: 'right',
        formatter: (params) => {
          const val = params.name === '积极峰值' ? pos : neg;
          return val.toFixed(3);
      },
        fontSize: 13,
        fontWeight: 'bold',
        color: '#4e342e'
      },
      data: [
        { 
          value: neg, 
          name: '消极峰值',
          itemStyle: { 
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#ef5350' },
                { offset: 1, color: '#e53935' }
              ]
            },
            borderRadius: [8, 0, 0, 8]
          }
        },
        { 
          value: pos,
          name: '积极峰值',
          itemStyle: { 
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#81c784' },
                { offset: 1, color: '#66bb6a' }
              ]
            },
            borderRadius: [0, 8, 8, 0]
          }
        }
      ]
    }]
  };
});

const emotionTrajectoryChartOption = computed(() => {
  if (!conversationData.value || !conversationData.value.emotion_trajectory) return {};
  const traj = conversationData.value.emotion_trajectory;

  const seqMap = {};
  messageHistory.value.forEach(m => { seqMap[m.sequence] = m; });

  const derived = traj.map(t => {
    const m = seqMap[t.seq];
    const v = (m?.valence ?? t.valence ?? 0);
    const a = (m?.arousal ?? t.arousal ?? 0);
    const em = t.emotion ?? m?.primary_emotion;
    return { seq: t.seq, v, a, em };
  });

  const lineData = derived.map(d => [d.seq, d.v]);
  const bubbles = derived.map(d => ({ 
    value: [d.seq, d.v, d.a], 
    name: d.em, 
    itemStyle: { 
      color: EMOTION_COLOR_MAP[d.em] || '#888',
      borderColor: '#fff',
      borderWidth: 2,
      shadowBlur: 6,
      shadowColor: 'rgba(0,0,0,0.15)'
    }
  }));

  const bubbleSize = (data) => {
    const a = data && Array.isArray(data) ? (data[2] ?? 0) : 0;
    return 10 + Math.round(a * 20);
  };

  // 计算统计信息
  const avgValence = derived.reduce((sum, d) => sum + d.v, 0) / derived.length;
  const maxValence = Math.max(...derived.map(d => d.v));
  const minValence = Math.min(...derived.map(d => d.v));

  return {
    title: {
      text: `情感波动曲线`,
      subtext: `平均: ${avgValence.toFixed(2)} | 峰值: ${maxValence.toFixed(2)} | 谷值: ${minValence.toFixed(2)}`,
      left: 'center',
      top: 5,
      textStyle: { 
        fontSize: 14, 
        fontWeight: 600,
        color: '#4e342e'
      },
      subtextStyle: {
        fontSize: 11,
        color: '#8d6e63'
      }
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e8d5c4',
      borderWidth: 1,
      textStyle: { fontSize: 13 },
      formatter: (p) => {
        const val = p.value;
        const isArr = Array.isArray(val);
        const seq = isArr ? (val[0] ?? '') : (p.axisValue ?? '');
        const v = isArr ? (val[1] ?? 0) : (typeof val === 'number' ? val : 0);
        const a = isArr ? (val[2] ?? (seqMap[seq]?.arousal ?? 0)) : (seqMap[seq]?.arousal ?? 0);
        const em = p.name || (seqMap[seq]?.primary_emotion || '');
        
        const emotionColor = EMOTION_COLOR_MAP[em] || '#888';
        
        return `<div style="padding:8px 10px;border-radius:10px;">
          <div style="font-weight:600;margin-bottom:6px;font-size:14px;color:${emotionColor};">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${emotionColor};margin-right:6px;"></span>
            #${seq} ${em}
          </div>
          <div style="font-size:13px;color:#555;margin:3px 0;">
            愉悦度: <b style="color:${v>=0?'#66bb6a':'#ef5350'};font-size:14px;">${(v ?? 0).toFixed(3)}</b>
          </div>
          <div style="font-size:13px;color:#555;margin:3px 0;">
            唤醒度: <b style="color:#ff8a65;font-size:14px;">${(a ?? 0).toFixed(3)}</b>
          </div>
        </div>`;
      }
    },
    grid: { left: 50, right: 30, top: 60, bottom: 35 },
    xAxis: {
      type: 'value',
      name: '消息序号',
      nameLocation: 'middle',
      nameGap: 25,
      nameTextStyle: { 
        color: '#6d4c41', 
        fontSize: 12,
        fontWeight: 500
      },
      axisLine: { show: true, lineStyle: { color: '#e8d5c4' } },
      axisLabel: { 
        color: '#8d6e63', 
        fontSize: 11,
        fontWeight: 500
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: -1,
      max: 1,
      name: '愉悦度',
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { 
        color: '#6d4c41', 
        fontSize: 13,
        fontWeight: 500
      },
      axisLine: { show: true, lineStyle: { color: '#e8d5c4' } },
      axisLabel: { 
        color: '#8d6e63', 
        fontSize: 11,
        fontWeight: 500,
        formatter: (val) => val.toFixed(1)
      },
      splitLine: { 
        show: true, 
        lineStyle: { color: '#f5f5f5', type: 'solid' } 
      }
    },
    visualMap: {
      show: false,
      dimension: 1,
      seriesIndex: 0,
      min: -1,
      max: 1,
      inRange: { color: ['#ef5350', '#ffb74d', '#66bb6a'] }
    },
    series: [
      {
        type: 'line',
        name: '愉悦度曲线',
        smooth: true,
        showSymbol: false,
        data: lineData,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.15,
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 187, 106, 0.3)' },
              { offset: 0.5, color: 'rgba(255, 183, 77, 0.2)' },
              { offset: 1, color: 'rgba(239, 83, 80, 0.3)' }
            ]
          }
        },
        markLine: { 
          silent: true, 
          symbol: 'none', 
          data: [
            { 
              yAxis: 0,
              lineStyle: { color: '#8d6e63', type: 'dashed', width: 2 },
              label: {
                show: true,
                position: 'end',
                formatter: '',
                fontSize: 11,
                color: '#8d6e63'
              }
            }
          ]
        }
      },
      {
        type: 'scatter',
        name: '情绪印记',
        data: bubbles,
        symbol: 'circle',
        symbolSize: bubbleSize,
        z: 10,
        emphasis: {
          scale: 1.3,
          focus: 'self'
        }
      }
    ]
  };
});

</script>

<template>
  <div id="app-container">
    <header class="app-header">
      <h1>智慧导师-情感分析智能体</h1>
    </header>

    <!-- 反馈弹窗 -->
    <div v-if="showFeedbackModal" class="modal-overlay" @click.self="cancelFeedback">
      <div class="modal-content">
        <div class="modal-header">
          <h3>💬 对话反馈</h3>
          <button class="close-btn" @click="cancelFeedback">×</button>
        </div>
        <div class="modal-body">
          <p class="feedback-prompt">感谢您的使用！请对本次对话进行评价：</p>
          
          <!-- 总体评分 -->
          <div class="rating-section">
            <div class="section-title">总体满意度</div>
            <div class="stars">
              <span 
                v-for="star in 5" 
                :key="star" 
                class="star"
                :class="{ active: star <= feedbackRating }"
                @click="feedbackRating = star"
                @mouseenter="feedbackRating = star"
              >
                ★
              </span>
            </div>
            <p class="rating-text">{{ feedbackRating > 0 ? `${feedbackRating} 分` : '请选择评分' }}</p>
          </div>

          <!-- 多维度评价 -->
          <div class="dimensions-section">
            <div class="section-title">详细评价</div>
            
            <div class="dimension-item">
              <div class="dimension-header">
                <span class="dimension-icon">🎯</span>
                <span class="dimension-label">回答准确性</span>
                <span class="dimension-score">{{ feedbackDimensions.accuracy }}/5</span>
              </div>
              <div class="dimension-slider">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  v-model.number="feedbackDimensions.accuracy"
                  class="slider"
                />
                <div class="slider-labels">
                  <span>不准确</span>
                  <span>非常准确</span>
                </div>
              </div>
            </div>

            <div class="dimension-item">
              <div class="dimension-header">
                <span class="dimension-icon">📝</span>
                <span class="dimension-label">表达清晰度</span>
                <span class="dimension-score">{{ feedbackDimensions.clarity }}/5</span>
              </div>
              <div class="dimension-slider">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  v-model.number="feedbackDimensions.clarity"
                  class="slider"
                />
                <div class="slider-labels">
                  <span>难理解</span>
                  <span>很清晰</span>
                </div>
              </div>
            </div>

            <div class="dimension-item">
              <div class="dimension-header">
                <span class="dimension-icon">❤️</span>
                <span class="dimension-label">情感共鸣</span>
                <span class="dimension-score">{{ feedbackDimensions.empathy }}/5</span>
              </div>
              <div class="dimension-slider">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  v-model.number="feedbackDimensions.empathy"
                  class="slider"
                />
                <div class="slider-labels">
                  <span>冷漠</span>
                  <span>很温暖</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 文字反馈 -->
          <div class="comment-section">
            <div class="section-title">其他建议（可选）</div>
            <textarea 
              v-model="feedbackComment" 
              class="feedback-textarea"
              placeholder="您可以在此留下更多反馈意见，帮助我们改进..."
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="cancelFeedback">取消</button>
          <button class="btn-primary" @click="submitFeedbackAndStartNew" :disabled="feedbackRating === 0">
            提交并开启新对话
          </button>
        </div>
      </div>
    </div>

    <div class="main-layout">
      <!-- ==================== 左侧：对话与控制 ==================== -->
      <div class="chat-panel">
        <div class="conversation-controls">
          <button @click="startNewConversation" :disabled="isFinalizing">
            {{ isFinalizing ? '分析中...' : '开启新对话' }}
          </button>
          <span class="conversation-id">ID: {{ conversationId.substring(0, 8) }}...</span>
        </div>

        <div class="chat-window" ref="chatWindow">
          <div v-for="(log, index) in conversationLog" :key="index" :class="['message', `message-${log.type}`]">
            <div class="avatar" :title="log.type">
              <svg v-if="log.type === 'user'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <svg v-else-if="log.type === 'bot'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9.5 9.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm5 5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm0-5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg>
            </div>
            <div class="message-content">
              <p>{{ log.text }}<span v-if="isLoading && index === conversationLog.length - 1" class="typing-cursor"></span></p>
            </div>
          </div>
        </div>

        <div class="chat-input-area">
          <textarea v-model="currentMessageText" @keydown.enter.prevent="handleSendMessage" placeholder="输入消息后按 Enter 发送..." :disabled="isLoading"></textarea>
          <button @click="handleSendMessage" :disabled="isLoading">{{ isLoading ? '分析中...' : '发送' }}</button>
        </div>
      </div>

      <!-- ==================== 右侧：数据展示 ==================== -->
      <div class="data-panel">
        <div class="dashboard-header">
          <h2>数据仪表盘</h2>
          <div class="view-switcher">
            <button @click="dashboardView = 'realtime'" :class="{ active: dashboardView === 'realtime' }">实时</button>
            <button @click="dashboardView = 'profile'" :class="{ active: dashboardView === 'profile' }" :disabled="!profileData">画像</button>
          </div>
        </div>
        
        <!-- 实时视图 -->
        <div v-if="dashboardView === 'realtime'" class="view-container">
          <div v-if="conversationData" class="kpi-row">
            <div class="kpi-card">
              <div class="kpi-title">主导情感</div>
              <div class="kpi-value">{{ conversationData.dominant_emotion }}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">认知状态</div>
              <div class="kpi-value" :class="`cognitive-${conversationData.cognitive_state}`">{{ conversationData.cognitive_state }}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">情感趋势</div>
              <div class="kpi-badge" :class="`trend-${conversationData.valence_trend}`">{{ conversationData.valence_trend }}</div>
            </div>
          </div>
          <details class="data-section" open>
            <summary><h3>对话详细数据</h3></summary>
            <div v-if="conversationData" class="data-content conversation-data">
              <div class="grid-item"><strong>ID:</strong> <span>{{ conversationData.conversation_id.substring(0, 8) }}...</span></div>
              <div class="grid-item"><strong>总消息数:</strong> <span>{{ conversationData.total_messages }}</span></div>
              <div class="grid-item"><strong>情感稳定性:</strong> <span>{{ conversationData.sentiment_stability.toFixed(3) }}</span></div>
              <div class="grid-item"><strong>持续时长 (分):</strong> <span>{{ conversationData.duration_minutes }}</span></div>
              <div class="grid-item grid-span-2">
                <strong>情感峰值:</strong>
                <v-chart class="mini-chart" :option="peakSentimentChartOption" autoresize />
              </div>
              <div class="grid-item grid-span-2">
                <strong>情感轨迹:</strong>
                <v-chart class="mini-chart" :option="emotionTrajectoryChartOption" autoresize />
              </div>
            </div>
            <div v-else class="placeholder">发送消息后将显示会话数据...</div>
          </details>

          <details class="data-section" open>
            <summary><h3>消息与异常分析</h3></summary>
            <div class="data-content message-history-with-anomaly">
              <div v-if="messageHistory.length === 0" class="placeholder">暂无消息...</div>
              
              <details v-for="msg in messageHistory" :key="msg.message_id" class="message-item">
                <summary class="message-summary">
                  <span class="seq">#{{ msg.sequence }}</span>
                  <span class="emotion">{{ msg.primary_emotion }}</span>
                  <span class="vda-summary">
                    V: <b :style="{ color: msg.valence > 0 ? '#2e7d32' : '#c62828' }">{{ msg.valence.toFixed(2) }}</b>
                    A: <b>{{ msg.arousal.toFixed(2) }}</b>
                    D: <b>{{ msg.dominance.toFixed(2) }}</b>
                  </span>
                  <span v-if="anomalies[msg.message_id]" class="anomaly-tag" title="检测到异常">⚠️</span>
                  <span v-else class="no-anomaly-tag" title="正常">✓</span>
                </summary>

                <!-- 消息详情面板 -->
                <div class="message-details">
                  <div class="detail-grid">
                    <div class="detail-section">
                      <h4 class="detail-title">情感分数 (Emotion Scores)</h4>
                      <div class="scores-grid">
                        <div v-for="(score, emotion) in msg.emotion_scores" :key="emotion" class="score-item">
                          <span class="emotion-name">{{ emotion }}</span>
                          <div class="score-bar-container">
                            <div class="score-bar" :style="{ width: `${score * 100}%` }"></div>
                          </div>
                          <span class="score-value">{{ score.toFixed(2) }}</span>
                        </div>
                      </div>
                      <h4 class="detail-title meta-title">分析元数据</h4>
                        <div class="meta-grid">
                            <div class="meta-item">
                                <span class="meta-label">分析模型:</span>
                                <span class="meta-value model-name">{{ msg.analysis_model }}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">置信度:</span>
                                <span class="meta-value">{{ (msg.confidence_score * 100).toFixed(1) }}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div v-if="anomalies[msg.message_id]" class="detail-section">
                      <h4 class="detail-title anomaly-title">检测到的异常</h4>
                      <div v-for="anom in anomalies[msg.message_id]" :key="anom.detection_id" class="anomaly-detail">
                        <p><strong>类型:</strong> <span>{{ anom.anomaly_type }}</span></p>
                        <p><strong>严重等级:</strong> <span>{{ anom.severity_level }} (Score: {{ anom.anomaly_score.toFixed(2) }})</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </details>
        </div>

        <!-- 用户画像视图 -->
        <div v-if="dashboardView === 'profile'" class="view-container">
          <div v-if="profileData" class="profile-view">
            <div class="kpi-row">
              <div class="kpi-card kpi-ring" :style="{ '--progress': Math.round(profileData.engagement_index * 100) }">
                <div class="ring"><span>{{ (profileData.engagement_index * 100).toFixed(0) }}%</span></div>
                <div class="kpi-title">投入度</div>
              </div>
              <div class="kpi-card kpi-ring" :style="{ '--progress': Math.round((1 - profileData.frustration_index) * 100) }">
                <div class="ring"><span>{{ ((1 - profileData.frustration_index) * 100).toFixed(0) }}%</span></div>
                <div class="kpi-title">抗压力</div>
              </div>
              <div class="kpi-card kpi-ring" :style="{ '--progress': Math.round(profileData.stability_baseline * 100) }">
                <div class="ring"><span>{{ (profileData.stability_baseline * 100).toFixed(0) }}%</span></div>
                <div class="kpi-title">稳定性</div>
              </div>
            </div>
            <summary><h3>用户画像分析</h3></summary>
            <div class="chart-container">
              <v-chart class="chart" :option="emotionProfileChartOption" autoresize />
              <v-chart class="chart" :option="learningStateChartOption" autoresize />
            </div>
            <details class="data-section" open>
              <div class="data-content profile-details">
                  <details class="sub-details" open>
                    <summary class="sub-summary">核心指标</summary>
                    <div class="sub-content">
                      <p><strong>投入度指数:</strong> <span>{{ profileData.engagement_index.toFixed(3) }}</span></p>
                      <p><strong>挫败感指数:</strong> <span>{{ profileData.frustration_index.toFixed(3) }}</span></p>
                      <p><strong>长期稳定性:</strong> <span>{{ profileData.stability_baseline.toFixed(3) }}</span></p>
                    </div>
                  </details>
                  <details class="sub-details" open>
                    <summary class="sub-summary">情感基线 (VAD)</summary>
                    <div class="sub-content">
                      <p><strong>平均愉悦度:</strong> <span>{{ profileData.sentiment_baseline.avg_valence.toFixed(3) }}</span></p>
                      <p><strong>平均唤醒度:</strong> <span>{{ profileData.sentiment_baseline.avg_arousal.toFixed(3) }}</span></p>
                      <p><strong>平均掌控感:</strong> <span>{{ profileData.sentiment_baseline.avg_dominance.toFixed(3) }}</span></p>
                    </div>
                  </details>
                   <details class="sub-details" open>
                    <summary class="sub-summary">元数据</summary>
                     <div class="sub-content">
                        <p><strong>用户ID:</strong> <span>{{ profileData.user_id }}</span></p>
                        <p><strong>总对话数:</strong> <span>{{ profileData.total_conversations }}</span></p>
                        <p><strong>总消息数:</strong> <span>{{ profileData.total_messages }}</span></p>
                        <p><strong>画像可信度:</strong> <span>{{ profileData.profile_confidence.toFixed(3) }}</span></p>
                     </div>
                  </details>
              </div>
            </details>
          </div>
          <div v-else class="placeholder">完成第一次会话后将生成用户画像...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 全局样式 - 温暖人文配色 */
:root {
  --primary-color: #ff8a65;
  --primary-hover: #ff7043;
  --primary-light: #ffab91;
  --secondary-color: #6d4c41;
  --accent-color: #ffb74d;
  --success-color: #81c784;
  --danger-color: #ef5350;
  --warning-color: #ffb74d;
  --border-color: #e8d5c4;
  --border-light: #f5e6d3;
  --bg-light: #fff8f0;
  --bg-warm: #fef5ed;
  --bg-white: #fffbf7;
  --bg-card: #ffffff;
  --text-dark: #4e342e;
  --text-medium: #6d4c41;
  --text-light: #8d6e63;
  --shadow-soft: rgba(141, 110, 99, 0.08);
  --shadow-medium: rgba(141, 110, 99, 0.15);
  --shadow-strong: rgba(141, 110, 99, 0.25);
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  margin: 0;
  background: linear-gradient(135deg, #fff8f0 0%, #fef5ed 100%);
  color: var(--text-dark);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app-container { 
  display: flex; 
  flex-direction: column; 
  height: 100vh;
  overflow: hidden;
}

.app-header {
  background: linear-gradient(135deg, #8d6e63 0%, #6d4c41 100%);
  color: #fff8f0;
  padding: 20px 32px;
  text-align: center;
  box-shadow: 0 4px 20px var(--shadow-medium);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 138, 101, 0.1) 0%, transparent 100%);
  pointer-events: none;
}

.app-header h1 {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-size: 1.5em;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.main-layout { 
  display: flex; 
  flex: 1; 
  overflow: hidden; 
  padding: 24px; 
  gap: 24px;
  min-height: 0;
}

/* 聊天面板 */
.chat-panel { 
  flex: 3; 
  display: flex; 
  flex-direction: column; 
  background: var(--bg-card); 
  border-radius: 20px; 
  box-shadow: 0 8px 24px var(--shadow-soft); 
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.chat-panel:hover {
  box-shadow: 0 12px 32px var(--shadow-medium);
}

.conversation-controls { 
  padding: 16px 20px; 
  border-bottom: 2px solid var(--border-light); 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  flex-shrink: 0;
  background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);
}

.conversation-controls button {
  padding: 10px 24px;
  font-size: 0.95em;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 138, 101, 0.25);
}

.conversation-id { 
  font-size: 0.85em; 
  color: var(--text-light); 
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  background: var(--bg-warm);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  font-weight: 500;
}

.chat-window { 
  flex: 1; 
  padding: 24px; 
  overflow-y: auto;
  scroll-behavior: smooth;
}

.chat-window::-webkit-scrollbar {
  width: 8px;
}

.chat-window::-webkit-scrollbar-track {
  background: var(--bg-warm);
  border-radius: 4px;
}

.chat-window::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.chat-window::-webkit-scrollbar-thumb:hover {
  background: var(--text-light);
}

.message { 
  display: flex; 
  gap: 14px; 
  margin-bottom: 20px; 
  max-width: 85%;
  animation: messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user { 
  margin-left: auto; 
  flex-direction: row-reverse; 
}

.avatar { 
  width: 40px; 
  height: 40px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, #bcaaa4 0%, #8d6e63 100%); 
  color: white; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 0.9em; 
  font-weight: bold; 
  flex-shrink: 0; 
  box-shadow: 0 4px 12px var(--shadow-soft);
  transition: transform 0.3s ease;
}

.message:hover .avatar {
  transform: scale(1.05);
}

.message-user .avatar { 
  background: linear-gradient(135deg, #ffab91 0%, #ff8a65 100%); 
}

.message-bot .avatar { 
  background: linear-gradient(135deg, #a1887f 0%, #8d6e63 100%); 
}

.message-system { 
  justify-content: center; 
  font-size: 0.85em; 
  color: var(--text-light); 
  max-width: 100%; 
  margin: 16px 0;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.message-system .avatar { 
  display: none; 
}

.message-content p { 
  padding: 14px 18px; 
  border-radius: 18px; 
  margin: 0; 
  line-height: 1.6; 
  background-color: var(--bg-warm); 
  box-shadow: 0 2px 8px var(--shadow-soft);
  position: relative;
  word-wrap: break-word;
}

.message-user .message-content p { 
  background: linear-gradient(135deg, #ff8a65 0%, #ff7043 100%); 
  color: white;
  box-shadow: 0 4px 12px rgba(255, 138, 101, 0.3);
}

.chat-input-area { 
  display: flex; 
  padding: 20px; 
  border-top: 2px solid var(--border-light); 
  gap: 12px; 
  flex-shrink: 0;
  background: linear-gradient(135deg, #ffffff 0%, #fff8f0 100%);
}

.chat-input-area textarea { 
  flex: 1; 
  padding: 14px 16px; 
  border: 2px solid var(--border-color); 
  border-radius: 12px; 
  resize: none; 
  font-family: inherit; 
  font-size: 1em; 
  height: 56px;
  transition: all 0.3s ease;
  background: white;
}

.chat-input-area textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(255, 138, 101, 0.1);
}

.chat-input-area button { 
  padding: 0 32px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 138, 101, 0.3);
}

button { 
  border: none; 
  background: linear-gradient(135deg, #ff8a65 0%, #ff7043 100%); 
  color: white; 
  padding: 12px 20px; 
  border-radius: 24px; 
  cursor: pointer; 
  transition: all 0.3s ease; 
  font-weight: 500; 
  box-shadow: 0 2px 8px var(--shadow-soft);
  font-size: 0.95em;
}

button:hover { 
  background: linear-gradient(135deg, #ff7043 0%, #f4511e 100%); 
  box-shadow: 0 6px 16px var(--shadow-medium); 
  transform: translateY(-2px); 
}

button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px var(--shadow-soft);
}

button:disabled { 
  background: linear-gradient(135deg, #d7ccc8 0%, #bcaaa4 100%); 
  cursor: not-allowed; 
  box-shadow: none; 
  transform: none;
  opacity: 0.6;
}

/* 对话窗口 */
.avatar svg { width: 24px; height: 24px; }
.message-content p { position: relative; }
.typing-cursor {
  display: inline-block;
  width: 8px;
  height: 1em;
  background-color: var(--text-dark);
  animation: blink 1s infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 数据面板 */
.data-panel { 
  flex: 2; 
  background: var(--bg-card); 
  border-radius: 20px; 
  box-shadow: 0 8px 24px var(--shadow-soft); 
  border: 1px solid var(--border-light); 
  padding: 24px; 
  overflow-y: auto;
  transition: box-shadow 0.3s ease;
}

.data-panel:hover {
  box-shadow: 0 12px 32px var(--shadow-medium);
}

.data-panel::-webkit-scrollbar {
  width: 8px;
}

.data-panel::-webkit-scrollbar-track {
  background: var(--bg-warm);
  border-radius: 4px;
}

.data-panel::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.data-panel::-webkit-scrollbar-thumb:hover {
  background: var(--text-light);
}

.data-section { 
  border-bottom: 2px solid var(--border-light); 
  margin-bottom: 20px; 
  padding-bottom: 20px;
}

.data-section:last-child { 
  border-bottom: none; 
}

.data-section summary { 
  cursor: pointer; 
  outline: none; 
  font-weight: 600; 
  display: flex; 
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
  user-select: none;
}

.data-section summary:hover {
  background: var(--bg-warm);
}

.data-section summary h3 { 
  display: inline-block; 
  margin: 0; 
  font-size: 1.15em; 
  color: var(--text-dark);
}

.data-content { 
  font-size: 0.95em; 
  color: var(--text-light); 
  margin-top: 16px;
  animation: fadeIn 0.3s ease;
}

.conversation-data div, .profile-data div { 
  margin-bottom: 10px; 
  display: flex; 
  justify-content: space-between;
}

.conversation-data span, .profile-data span { 
  font-weight: 500; 
  color: var(--text-dark); 
}

.profile-data b { 
  font-size: 1.1em; 
}

.placeholder { 
  color: var(--text-light); 
  text-align: center; 
  padding: 32px 20px;
  font-style: italic;
  background: var(--bg-warm);
  border-radius: 12px;
  border: 2px dashed var(--border-color);
}

.sub-details { 
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.sub-summary { 
  font-weight: 600; 
  cursor: pointer; 
  font-size: 0.95em; 
  color: var(--primary-color);
  padding: 10px 14px;
  background: var(--bg-warm);
  border-radius: 8px;
  transition: all 0.3s ease;
  user-select: none;
}

.sub-summary:hover {
  background: linear-gradient(135deg, #ffe0cc 0%, #ffd4b8 100%);
  transform: translateX(4px);
}

.sub-content { 
  padding: 14px 0 0 20px; 
  border-left: 3px solid var(--primary-color); 
  margin-top: 8px;
  margin-left: 8px;
}

.sub-content p { 
  margin: 8px 0;
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.message-history-with-anomaly .message-item { 
  border-bottom: 1px solid var(--border-light);
  transition: all 0.3s ease;
}

.message-history-with-anomaly .message-item:hover {
  background: var(--bg-warm);
  border-radius: 8px;
}

.message-history-with-anomaly .message-item:last-child { 
  border-bottom: none; 
}

.message-summary { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  cursor: pointer; 
  padding: 12px 10px;
  transition: all 0.3s ease;
  user-select: none;
}

.message-summary:hover {
  padding-left: 14px;
}

.message-summary .seq { 
  font-weight: 700; 
  color: var(--text-dark); 
  font-size: 0.85em; 
  width: 36px;
  background: var(--bg-warm);
  padding: 4px 8px;
  border-radius: 8px;
  text-align: center;
}

.message-summary .emotion { 
  font-weight: 600; 
  flex: 1;
  color: var(--text-medium);
}

.message-summary .valence { 
  font-family: 'SF Mono', 'Monaco', monospace; 
}

.anomaly-tag, .no-anomaly-tag { 
  margin-left: auto; 
  font-size: 0.9em; 
  padding: 4px 10px; 
  border-radius: 16px; 
  font-weight: 600;
  transition: all 0.3s ease;
}

.anomaly-tag { 
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%); 
  color: #e65100;
  box-shadow: 0 2px 8px rgba(230, 81, 0, 0.2);
}

.no-anomaly-tag { 
  background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%); 
  color: #2e7d32;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.2);
}

.message-details { 
  padding: 20px 24px; 
  background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%); 
  border-top: 2px solid var(--border-light);
  margin-top: 8px;
  border-radius: 0 0 12px 12px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-details h4 { 
  margin: 12px 0 8px 0; 
  font-size: 1.05em;
  font-weight: 600;
}

.message-details .anomaly-title { 
  color: var(--danger-color); 
}

.message-details pre { 
  white-space: pre-wrap; 
  word-break: break-all; 
  background: var(--bg-warm); 
  padding: 12px; 
  border-radius: 8px; 
  font-size: 0.85em;
  border: 1px solid var(--border-color);
}

.anomaly-detail { 
  border-left: 4px solid var(--danger-color); 
  padding-left: 14px; 
  margin: 12px 0;
  background: rgba(239, 83, 80, 0.05);
  padding: 12px 14px;
  border-radius: 0 8px 8px 0;
}

.anomaly-detail p { 
  margin: 6px 0; 
}


.dashboard-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border-light);
}

.dashboard-header h2 { 
  margin: 0;
  font-size: 1.4em;
  font-weight: 600;
  color: var(--text-dark);
}

.view-switcher { 
  display: flex; 
  gap: 6px;
  background: var(--bg-warm);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.view-switcher button { 
  background: transparent; 
  color: var(--text-medium); 
  font-size: 0.9em; 
  padding: 8px 18px; 
  box-shadow: none;
  border-radius: 8px;
  font-weight: 500;
}

.view-switcher button:hover { 
  background: rgba(255, 138, 101, 0.1); 
  transform: none; 
}

.view-switcher button:disabled { 
  background: transparent; 
  color: #ccc; 
  cursor: not-allowed;
  opacity: 0.5;
}

.view-switcher button.active { 
  background: linear-gradient(135deg, #ff8a65 0%, #ff7043 100%); 
  color: white; 
  font-weight: 600; 
  box-shadow: 0 4px 12px rgba(255, 138, 101, 0.3);
}

.conversation-data {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

.grid-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: baseline;
  padding: 10px 14px;
  background: var(--bg-warm);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.grid-item:hover {
  background: linear-gradient(135deg, #ffe0cc 0%, #ffd4b8 100%);
  transform: translateX(4px);
}

.grid-span-2 { 
  grid-column: span 2; 
  flex-direction: column; 
  align-items: flex-start; 
  gap: 8px;
  padding: 16px;
}

.conversation-data span { 
  font-weight: 600; 
  color: var(--text-dark); 
}

.peak-sentiment { 
  display: flex; 
  gap: 20px; 
  font-size: 0.95em; 
}

.trajectory-container { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 6px; 
  margin-top: 8px; 
}

.trajectory-item { 
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); 
  color: #1565c0; 
  padding: 4px 10px; 
  border-radius: 8px; 
  font-size: 0.85em;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(21, 101, 192, 0.15);
}

.mini-chart { 
  width: 100%; 
  height: 200px; 
  border: 2px solid var(--border-light); 
  border-radius: 16px; 
  padding: 12px; 
  background: white; 
  box-shadow: 0 4px 12px var(--shadow-soft);
  transition: all 0.3s ease;
}

.mini-chart:hover {
  box-shadow: 0 6px 20px var(--shadow-medium);
  transform: translateY(-2px);
}

.timestamp { 
  font-size: 0.85em; 
  color: var(--text-light); 
  text-align: right; 
  grid-column: span 2;
  font-style: italic;
}

.vda-summary { 
  font-family: 'SF Mono', 'Monaco', monospace; 
  font-size: 0.9em; 
  display: flex; 
  gap: 12px;
  background: var(--bg-warm);
  padding: 4px 10px;
  border-radius: 8px;
}

.vda-summary b { 
  font-weight: 700; 
}

.message-summary .anomaly-tag, .message-summary .no-anomaly-tag {
  width: 28px; 
  height: 28px; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  border-radius: 50%; 
  margin-left: auto; 
  font-size: 1.1em;
}

.profile-view { 
  display: flex; 
  flex-direction: column; 
  gap: 24px;
  animation: fadeIn 0.5s ease;
}

.chart-container { 
  display: flex; 
  gap: 16px; 
  width: 100%; 
  height: 320px; 
}

.chart { 
  flex: 1; 
  border: 2px solid var(--border-light); 
  border-radius: 16px; 
  padding: 12px; 
  background: white;
  box-shadow: 0 4px 12px var(--shadow-soft);
  transition: all 0.3s ease;
}

.chart:hover {
  box-shadow: 0 8px 24px var(--shadow-medium);
  transform: translateY(-4px);
}

.profile-details .sub-details { 
  margin-bottom: 12px; 
}

.profile-details .sub-content p { 
  display: flex; 
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  margin: 6px 0;
  transition: all 0.3s ease;
}

.profile-details .sub-content p:hover {
  background: var(--bg-warm);
  transform: translateX(4px);
}

/* 消息详情面板的整体布局 */
.message-details { 
  padding: 15px 20px; 
  background: var(--bg-warm); 
  border-top: 1px solid var(--border-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.detail-section {
  min-width: 0; /* 防止网格项内容溢出 */
}

.detail-title {
  margin: 0 0 10px 0;
  font-size: 1em;
  font-weight: 600;
  color: var(--text-dark);
}

/* 情感分数网格布局 */
.scores-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 15px; /* 垂直间距 8px, 水平间距 15px */
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.emotion-name {
  width: 40px; /* 固定宽度，让其对齐 */
  text-align: right;
  color: var(--text-light);
}

.score-bar-container {
  flex-grow: 1;
  background-color: #e0e0e0;
  border-radius: 4px;
  height: 8px;
  overflow: hidden; /* 确保内部bar不会溢出圆角 */
}

.score-bar {
  background: linear-gradient(90deg, #ffab91, #ff8a65);
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
}

.score-value {
  width: 45px; /* 固定宽度 */
  font-family: monospace;
  font-weight: bold;
  color: var(--text-dark);
}

/* 异常详情样式 */
.anomaly-title { 
  color: var(--danger-color); 
}

.anomaly-detail { 
  border-left: 3px solid var(--danger-color); 
  padding-left: 10px; 
  margin: 10px 0;
  font-size: 0.9em;
}
.anomaly-detail p { 
  margin: 5px 0; 
  display: flex;
  justify-content: space-between;
}
.anomaly-detail span {
  font-weight: 500;
  color: var(--text-dark);
}

/* 元数据标题的上边距，将其与情感分数区域分开 */
.meta-title {
  margin-top: 15px;
}

/* 元数据网格布局 */
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 两列布局 */
  gap: 8px 15px;
  font-size: 0.9em;
}

.meta-item {
  display: flex;
  justify-content: space-between; /* 标签和值两端对齐 */
  align-items: center;
  background-color: var(--bg-warm); /* 轻微的背景色以区分 */
  padding: 4px 8px;
  border-radius: 6px;
}

.meta-label {
  color: var(--text-light);
}

.meta-value {
  font-weight: bold;
  font-family: monospace;
  color: var(--text-dark);
}

/* 为模型名称设置一个特殊的样式，如果它很长的话可以换行 */
.model-name {
  word-break: break-all;
}

.kpi-row { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 14px; 
  margin-bottom: 20px;
}

.kpi-card { 
  min-width: 200px; 
  background: linear-gradient(135deg, #ffffff 0%, #fff8f0 100%); 
  border: 2px solid var(--border-light); 
  border-radius: 18px; 
  padding: 18px 20px; 
  box-shadow: 0 6px 16px var(--shadow-soft); 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  color: var(--text-dark); 
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color) 0%, var(--accent-color) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.kpi-card:hover { 
  box-shadow: 0 10px 24px var(--shadow-medium); 
  transform: translateY(-4px);
  border-color: var(--primary-color);
}

.kpi-card:hover::before {
  opacity: 1;
}

.kpi-title { 
  font-size: 0.9em; 
  color: var(--text-light);
  font-weight: 500;
  letter-spacing: 0.3px;
}

.kpi-value { 
  font-size: 1.4em; 
  font-weight: 700; 
  font-family: 'SF Mono', 'Monaco', monospace;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 认知状态颜色编码 */
.cognitive-已掌握 { 
  color: #66bb6a !important; 
  text-shadow: 0 0 12px rgba(102, 187, 106, 0.4);
  -webkit-text-fill-color: #66bb6a;
}

.cognitive-探索中 { 
  color: #ffb74d !important; 
  text-shadow: 0 0 12px rgba(255, 183, 77, 0.4);
  -webkit-text-fill-color: #ffb74d;
}

.cognitive-未掌握 { 
  color: #ef5350 !important; 
  text-shadow: 0 0 12px rgba(239, 83, 80, 0.4);
  -webkit-text-fill-color: #ef5350;
}

.kpi-badge { 
  border: 2px solid var(--border-color); 
  border-radius: 20px; 
  padding: 6px 14px; 
  font-weight: 600; 
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.trend-上升 { 
  color: #66bb6a; 
  background: linear-gradient(135deg, rgba(129,199,132,0.15) 0%, rgba(129,199,132,0.25) 100%); 
  border-color: rgba(129,199,132,0.5);
  box-shadow: 0 2px 8px rgba(129,199,132,0.2);
}

.trend-下降 { 
  color: #ef5350; 
  background: linear-gradient(135deg, rgba(239,83,80,0.15) 0%, rgba(239,83,80,0.25) 100%); 
  border-color: rgba(239,83,80,0.5);
  box-shadow: 0 2px 8px rgba(239,83,80,0.2);
}

.trend-平稳 { 
  color: #ff8a65; 
  background: linear-gradient(135deg, rgba(255,138,101,0.15) 0%, rgba(255,138,101,0.25) 100%); 
  border-color: rgba(255,138,101,0.5);
  box-shadow: 0 2px 8px rgba(255,138,101,0.2);
}

.kpi-ring { 
  gap: 16px;
  flex-direction: column;
  align-items: center;
}

.kpi-ring .ring { 
  width: 90px; 
  height: 90px; 
  border-radius: 50%; 
  background: conic-gradient(var(--primary-color) calc(var(--progress)*1%), rgba(255,138,101,0.12) 0); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  position: relative; 
  border: 3px solid var(--border-light); 
  box-shadow: 0 4px 12px var(--shadow-soft), inset 0 0 24px rgba(255,138,101,0.1);
  transition: all 0.3s ease;
}

.kpi-ring:hover .ring {
  transform: scale(1.05);
  box-shadow: 0 6px 16px var(--shadow-medium), inset 0 0 24px rgba(255,138,101,0.15);
}

.kpi-ring .ring::after { 
  content: ""; 
  position: absolute; 
  width: 72px; 
  height: 72px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, #ffffff 0%, #fff8f0 100%); 
  box-shadow: inset 0 0 0 2px var(--border-light);
}

.kpi-ring .ring span { 
  position: relative; 
  color: var(--text-dark); 
  font-weight: 700; 
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 1.1em;
  z-index: 1;
}

/* 反馈弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(78, 52, 46, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--bg-white);
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(78, 52, 46, 0.25);
  width: 90%;
  max-width: 580px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid var(--border-color);
}

@keyframes slideUp {
  from { transform: translateY(40px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.modal-header {
  padding: 24px 28px;
  border-bottom: 2px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #fff8f0 0%, #fef5ed 100%);
  border-radius: 18px 18px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4em;
  color: var(--text-dark);
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2em;
  color: var(--text-light);
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  line-height: 1;
}

.close-btn:hover {
  background-color: rgba(141, 110, 99, 0.1);
  color: var(--text-dark);
  transform: rotate(90deg);
}

.modal-body {
  padding: 28px;
}

.feedback-prompt {
  margin: 0 0 24px 0;
  font-size: 1em;
  color: var(--text-medium);
  text-align: center;
}

/* 评分区域 */
.rating-section {
  background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
}

.section-title {
  font-size: 1em;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rating-section .section-title {
  justify-content: center;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.star {
  font-size: 2.8em;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.star:hover {
  transform: scale(1.2) rotate(10deg);
}

.star.active {
  color: #ffb74d;
  text-shadow: 0 0 12px rgba(255, 183, 77, 0.6);
  transform: scale(1.1);
}

.rating-text {
  font-size: 1.1em;
  color: var(--text-medium);
  margin: 0;
  min-height: 28px;
  font-weight: 500;
}

/* 多维度评价区域 */
.dimensions-section {
  margin-bottom: 24px;
}

.dimension-item {
  background: var(--bg-warm);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
  transition: all 0.3s ease;
}

.dimension-item:hover {
  box-shadow: 0 4px 12px var(--shadow-soft);
  transform: translateY(-2px);
  border-color: var(--primary-color);
}

.dimension-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.dimension-icon {
  font-size: 1.4em;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px var(--shadow-soft);
}

.dimension-label {
  flex: 1;
  font-weight: 500;
  color: var(--text-dark);
  font-size: 0.95em;
}

.dimension-score {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 1.1em;
  font-family: monospace;
  background: white;
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 6px var(--shadow-soft);
}

.dimension-slider {
  padding: 0 4px;
}

.slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #ef5350 0%, #ffb74d 50%, #66bb6a 100%);
  outline: none;
  -webkit-appearance: none;
  margin-bottom: 8px;
  cursor: pointer;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 3px var(--primary-color);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 4px var(--primary-color);
}

.slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 3px var(--primary-color);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 4px var(--primary-color);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: var(--text-light);
  padding: 0 4px;
}

/* 评论区域 */
.comment-section {
  margin-bottom: 8px;
}

.feedback-textarea {
  width: 100%;
  padding: 14px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.95em;
  resize: vertical;
  transition: all 0.3s ease;
  background: var(--bg-warm);
  color: var(--text-dark);
  box-sizing: border-box;
}

.feedback-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(255, 138, 101, 0.15);
  background: white;
}

.feedback-textarea::placeholder {
  color: var(--text-light);
}

.modal-footer {
  padding: 20px 28px;
  border-top: 2px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--bg-light);
  border-radius: 0 0 18px 18px;
}

.btn-secondary {
  background: white;
  color: var(--text-medium);
  padding: 12px 24px;
  border: 2px solid var(--border-color);
  border-radius: 24px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px var(--shadow-soft);
  font-size: 0.95em;
}

.btn-secondary:hover {
  background: var(--bg-warm);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-medium);
}

.btn-primary {
  background: linear-gradient(135deg, #ff8a65 0%, #ff7043 100%);
  color: white;
  padding: 12px 28px;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 138, 101, 0.4);
  font-size: 0.95em;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ff7043 0%, #f4511e 100%);
  box-shadow: 0 6px 16px rgba(255, 138, 101, 0.5);
  transform: translateY(-2px);
}

.btn-primary:disabled {
  background: linear-gradient(135deg, #d7ccc8 0%, #bcaaa4 100%);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
  opacity: 0.6;
}
</style>