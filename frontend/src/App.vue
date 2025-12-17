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
  conversationLog.value = [{ type: 'system', text: `新对话已开始 (ID: ${newId.substring(0, 8)}...)` }];
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
    initializeNewConversation();
    isFinalizing.value = false;
  }
}

function cancelFeedback() {
  showFeedbackModal.value = false;
  feedbackRating.value = 0;
  feedbackComment.value = '';
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
    
    // 使用全部8种情感
    const indicator = [
        { name: '兴奋', max: 1 }, { name: '自信', max: 1 }, { name: '好奇', max: 1 },
        { name: '困惑', max: 1 }, { name: '焦虑', max: 1 }, { name: '沮丧', max: 1 },
        { name: '愤怒', max: 1 }, { name: '厌倦', max: 1 }
    ];
    const data = [
      (dist['兴奋'] || 0) / total, (dist['自信'] || 0) / total, (dist['好奇'] || 0) / total,
      (dist['困惑'] || 0) / total, (dist['焦虑'] || 0) / total, (dist['沮丧'] || 0) / total,
      (dist['愤怒'] || 0) / total, (dist['厌倦'] || 0) / total
    ].map(v => v.toFixed(3));

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
        title: { text: '学习状态模型', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'item' },
        radar: { indicator, shape: 'circle', center: ['50%', '55%'], radius: '65%' },
        series: [{ type: 'radar', data: [{ value: data, name: '学习状态' }], areaStyle: { opacity: 0.4 } }]
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
    tooltip: { trigger: 'axis' },
    grid: { left: 24, right: 10, top: 10, bottom: 10 },
    xAxis: { type: 'value', min: -1, max: 1, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category', data: ['积极', '消极'], axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#777', fontSize: 10 } },
    series: [{
      type: 'bar',
      barWidth: 14,
      data: [
        { value: pos, itemStyle: { color: '#2e7d32' } },
        { value: -Math.abs(neg), itemStyle: { color: '#c62828' } }
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
  const bubbles = derived.map(d => ({ value: [d.seq, d.v, d.a], name: d.em, itemStyle: { color: EMOTION_COLOR_MAP[d.em] || '#888' } }));

  const bubbleSize = (data) => {
    const a = data && Array.isArray(data) ? (data[2] ?? 0) : 0;
    return 6 + Math.round(a * 14);
  };

  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (p) => {
        const val = p.value;
        const isArr = Array.isArray(val);
        const seq = isArr ? (val[0] ?? '') : (p.axisValue ?? '');
        const v = isArr ? (val[1] ?? 0) : (typeof val === 'number' ? val : 0);
        const a = isArr ? (val[2] ?? (seqMap[seq]?.arousal ?? 0)) : (seqMap[seq]?.arousal ?? 0);
        const em = p.name || (seqMap[seq]?.primary_emotion || '');
        return `<div style="padding:6px 8px;border-radius:8px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="font-weight:600;margin-bottom:4px;">#${seq} ${em}</div>
          <div style="font-size:12px;color:#555;">Valence: <b style="color:${v>=0?'#2e7d32':'#c62828'}">${(v ?? 0).toFixed(3)}</b></div>
          <div style="font-size:12px;color:#555;">Arousal: <b>${(a ?? 0).toFixed(3)}</b></div>
        </div>`;
      }
    },
    grid: { left: 35, right: 10, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      name: '序号',
      nameTextStyle: { color: '#999', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: '#777', fontSize: 10 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: -1,
      max: 1,
      name: '愉悦度 (Valence)',
      nameTextStyle: { color: '#999', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: '#777', fontSize: 10 },
      splitLine: { show: true, lineStyle: { color: '#eee' } }
    },
    visualMap: {
      show: false,
      dimension: 1,
      seriesIndex: 0,
      min: -1,
      max: 1,
      inRange: { color: ['#c62828', '#2e7d32'] }
    },
    series: [
      {
        type: 'line',
        name: '愉悦度曲线',
        smooth: true,
        showSymbol: false,
        data: lineData,
        lineStyle: { width: 2 },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0 }], lineStyle: { color: '#bbb', type: 'dashed', width: 1 } }
      },
      {
        type: 'scatter',
        name: '情绪印记',
        data: bubbles,
        symbol: 'circle',
        symbolSize: bubbleSize,
        z: 10
      }
    ]
  };
});

</script>

<template>
  <div id="app-container">
    <header class="app-header">
      <h1>智慧导师-情感分析演示系统</h1>
    </header>

    <!-- 反馈弹窗 -->
    <div v-if="showFeedbackModal" class="modal-overlay" @click.self="cancelFeedback">
      <div class="modal-content">
        <div class="modal-header">
          <h3>对话反馈</h3>
          <button class="close-btn" @click="cancelFeedback">×</button>
        </div>
        <div class="modal-body">
          <p class="feedback-prompt">请对本次对话进行评价：</p>
          
          <div class="rating-container">
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

          <textarea 
            v-model="feedbackComment" 
            class="feedback-textarea"
            placeholder="您可以在此留下更多反馈意见（可选）..."
            rows="4"
          ></textarea>
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
              <div class="kpi-value">{{ conversationData.cognitive_state }}</div>
            </div>
            <div class="kpi-card kpi-ring" :style="{ '--progress': Math.round(conversationData.sentiment_stability * 100) }">
              <div class="ring"><span>{{ (conversationData.sentiment_stability * 100).toFixed(0) }}%</span></div>
              <div class="kpi-title">情感稳定性</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">趋势</div>
              <div class="kpi-badge" :class="`trend-${conversationData.valence_trend}`">{{ conversationData.valence_trend }}</div>
            </div>
          </div>
          <details class="data-section" open>
            <summary><h3>详细数据</h3></summary>
            <div v-if="conversationData" class="data-content conversation-data">
              <div class="grid-item"><strong>ID:</strong> <span>{{ conversationData.conversation_id.substring(0, 8) }}...</span></div>
              <div class="grid-item"><strong>总消息数:</strong> <span>{{ conversationData.total_messages }}</span></div>
              <div class="grid-item"><strong>主导情感:</strong> <span>{{ conversationData.dominant_emotion }}</span></div>
              <div class="grid-item"><strong>愉悦度趋势:</strong> <span>{{ conversationData.valence_trend }}</span></div>
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
              <div class="grid-item grid-span-2 timestamp">最后更新: {{ new Date(conversationData.last_updated_at).toLocaleTimeString() }}</div>
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
              <div class="kpi-card kpi-ring" :style="{ '--progress': Math.round(profileData.profile_confidence * 100) }">
                <div class="ring"><span>{{ (profileData.profile_confidence * 100).toFixed(0) }}%</span></div>
                <div class="kpi-title">画像可信度</div>
              </div>
            </div>
            <div class="chart-container">
              <v-chart class="chart" :option="emotionProfileChartOption" autoresize />
              <v-chart class="chart" :option="learningStateChartOption" autoresize />
            </div>
            <details class="data-section" open>
              <summary><h3>画像详细数据</h3></summary>
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
/* 全局样式 */
:root {
  --primary-color: #42b883;
  --secondary-color: #35495e;
  --danger-color: #e53935;
  --warning-color: #fdd835;
  --border-color: #e0e0e0;
  --bg-light: #f4f6f8;
  --bg-white: #ffffff;
  --text-dark: #2c3e50;
  --text-light: #5a738b;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  background-color: var(--bg-light);
  color: var(--text-dark);
}

#app-container { display: flex; flex-direction: column; height: 100vh; }

.app-header {
  background-color: var(--secondary-color);
  color: white;
  padding: 12px 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.main-layout { display: flex; flex: 1; overflow: hidden; padding: 20px; gap: 20px; }

/* 聊天面板 */
.chat-panel { flex: 3; display: flex; flex-direction: column; background: var(--bg-white); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid var(--border-color); }
.conversation-controls { padding: 10px 15px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px; flex-shrink: 0; }
.conversation-id { font-size: 0.8em; color: var(--text-light); font-family: monospace; }
.chat-window { flex: 1; padding: 20px; overflow-y: auto; }
.message { display: flex; gap: 12px; margin-bottom: 18px; max-width: 90%; }
.message-user { margin-left: auto; flex-direction: row-reverse; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background-color: var(--secondary-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.9em; font-weight: bold; flex-shrink: 0; }
.message-user .avatar { background-color: var(--primary-color); }
.message-bot .avatar { background-color: var(--secondary-color); }
.message-system { justify-content: center; font-size: 0.85em; color: var(--text-light); max-width: 100%; margin: 10px 0; }
.message-system .avatar { display: none; }
.message-content p { padding: 10px 15px; border-radius: 12px; margin: 0; line-height: 1.5; background-color: #f0f2f5; }
.message-user .message-content p { background-color: var(--primary-color); color: white; }
.chat-input-area { display: flex; padding: 15px; border-top: 1px solid var(--border-color); gap: 10px; flex-shrink: 0; }
.chat-input-area textarea { flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; resize: none; font-family: inherit; font-size: 1em; height: 50px; }
.chat-input-area button { padding: 0 25px; }
button { border: none; background-color: var(--primary-color); color: white; padding: 10px 15px; border-radius: 5px; cursor: pointer; transition: background-color 0.2s, box-shadow 0.2s; font-weight: 500; }
button:hover { background-color: #36a372; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
button:disabled { background-color: #a5d8c0; cursor: not-allowed; box-shadow: none; }

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
.data-panel { flex: 2; background: var(--bg-white); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid var(--border-color); padding: 20px; overflow-y: auto; }
.data-section { border-bottom: 1px solid #f0f0f0; margin-bottom: 15px; padding-bottom: 15px; }
.data-section:last-child { border-bottom: none; }
.data-section summary { cursor: pointer; outline: none; font-weight: 600; display: flex; align-items: center; }
.data-section summary h3 { display: inline-block; margin: 0; font-size: 1.1em; color: var(--text-dark); }
.data-content { font-size: 0.9em; color: var(--text-light); margin-top: 15px; }
.conversation-data div, .profile-data div { margin-bottom: 8px; display: flex; justify-content: space-between; }
.conversation-data span, .profile-data span { font-weight: 500; color: var(--text-dark); }
.profile-data b { font-size: 1.1em; }
.placeholder { color: #aaa; text-align: center; padding: 20px; }
.sub-details { margin-top: 10px; }
.sub-summary { font-weight: bold; cursor: pointer; font-size: 0.9em; color: var(--primary-color); }
.sub-content { padding: 10px 0 0 15px; border-left: 2px solid var(--border-color); margin-top: 5px; }
.sub-content p { margin: 5px 0; }

.message-history-with-anomaly .message-item { border-bottom: 1px solid #f0f0f0; }
.message-history-with-anomaly .message-item:last-child { border-bottom: none; }
.message-summary { display: flex; align-items: center; gap: 15px; cursor: pointer; padding: 8px 5px; }
.message-summary .seq { font-weight: bold; color: var(--text-dark); font-size: 0.8em; width: 30px; }
.message-summary .emotion { font-weight: 500; flex: 1; }
.message-summary .valence { font-family: monospace; }
.anomaly-tag, .no-anomaly-tag { margin-left: auto; font-size: 0.8em; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
.anomaly-tag { background-color: var(--warning-color); color: #5d4037; }
.no-anomaly-tag { background-color: #e8f5e9; color: #388e3c; }
.message-details { padding: 10px 15px 10px 25px; background: #fafafa; border-top: 1px dashed var(--border-color); }
.message-details h4 { margin: 10px 0 5px 0; font-size: 1em; }
.message-details .anomaly-title { color: var(--danger-color); }
.message-details pre { white-space: pre-wrap; word-break: break-all; background: #eee; padding: 8px; border-radius: 4px; font-size: 0.85em; }
.anomaly-detail { border-left: 3px solid var(--danger-color); padding-left: 10px; margin: 10px 0; }
.anomaly-detail p { margin: 4px 0; }


.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.dashboard-header h2 { margin: 0; }
.view-switcher { display: flex; gap: 5px; }
.view-switcher button { background-color: #eee; color: var(--text-dark); font-size: 0.9em; padding: 6px 12px; }
.view-switcher button:disabled { background-color: #f5f5f5; color: #ccc; cursor: not-allowed; }
.view-switcher button.active { background-color: var(--primary-color); color: white; font-weight: bold; }

.conversation-data {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 20px;
}
.grid-item { display: flex; justify-content: space-between; align-items: baseline; }
.grid-span-2 { grid-column: span 2; flex-direction: column; align-items: flex-start; gap: 5px; }
.conversation-data span { font-weight: 500; color: var(--text-dark); }
.peak-sentiment { display: flex; gap: 15px; font-size: 0.9em; }
.trajectory-container { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
.trajectory-item { background-color: #eef; color: #557; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; }
.mini-chart { width: 100%; height: 140px; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px; background: #fcfcfc; }
.timestamp { font-size: 0.8em; color: #aaa; text-align: right; grid-column: span 2; }

.vda-summary { font-family: monospace; font-size: 0.9em; display: flex; gap: 10px; }
.vda-summary b { font-weight: 600; }
.message-summary .anomaly-tag, .message-summary .no-anomaly-tag {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; margin-left: auto; font-size: 1.1em;
}

.profile-view { display: flex; flex-direction: column; gap: 20px; }
.chart-container { display: flex; gap: 10px; width: 100%; height: 300px; }
.chart { flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; }
.profile-details .sub-details { margin-bottom: 10px; }
.profile-details .sub-content p { display: flex; justify-content: space-between; }

/* 消息详情面板的整体布局 */
.message-details { 
  padding: 15px 20px; 
  background: #fdfdfd; 
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
  background: linear-gradient(90deg, var(--primary-color), #81c784);
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
  background-color: #f0f2f5; /* 轻微的背景色以区分 */
  padding: 4px 8px;
  border-radius: 4px;
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

.kpi-row { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
.kpi-card { min-width:180px; background: var(--tech-card, var(--bg-white)); border: 1px solid var(--tech-border, var(--border-color)); border-radius: 12px; padding: 12px 14px; box-shadow: 0 8px 18px rgba(0,0,0,0.12); display:flex; align-items:center; justify-content:space-between; color: var(--tech-text, var(--text-dark)); }
.kpi-title { font-size: 0.85em; color: var(--tech-subtle, var(--text-light)); }
.kpi-value { font-size: 1.2em; font-weight: 700; font-family: monospace; }
.kpi-badge { border: 1px solid var(--tech-border, var(--border-color)); border-radius: 999px; padding: 4px 10px; font-weight:600; font-size:0.85em; }
.trend-上升 { color: #00e5ff; background: rgba(0,229,255,0.12); border-color: rgba(0,229,255,0.35); }
.trend-下降 { color: #ff5252; background: rgba(255,82,82,0.12); border-color: rgba(255,82,82,0.35); }
.trend-平稳 { color: #8aa6c1; background: rgba(138,166,193,0.12); border-color: rgba(138,166,193,0.35); }
.kpi-ring { gap:12px; }
.kpi-ring .ring { width:80px; height:80px; border-radius:50%; background: conic-gradient(var(--tech-accent, var(--primary-color)) calc(var(--progress)*1%), rgba(102,224,255,0.08) 0); display:flex; align-items:center; justify-content:center; position:relative; border: 1px solid var(--tech-border, var(--border-color)); box-shadow: 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 24px rgba(102,224,255,0.08); }
.kpi-ring .ring::after { content:""; position:absolute; width:64px; height:64px; border-radius:50%; background: var(--tech-card, var(--bg-white)); box-shadow: inset 0 0 0 1px var(--tech-border, var(--border-color)); }
.kpi-ring .ring span { position:relative; color: var(--tech-text, var(--text-dark)); font-weight:600; font-family: monospace; }

/* 反馈弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3em;
  color: var(--text-dark);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2em;
  color: var(--text-light);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f0f0f0;
  color: var(--text-dark);
}

.modal-body {
  padding: 24px;
}

.feedback-prompt {
  margin: 0 0 20px 0;
  font-size: 1em;
  color: var(--text-dark);
}

.rating-container {
  text-align: center;
  margin-bottom: 20px;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.star {
  font-size: 2.5em;
  color: #ddd;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.star:hover {
  transform: scale(1.1);
}

.star.active {
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.rating-text {
  font-size: 1em;
  color: var(--text-light);
  margin: 0;
  min-height: 24px;
}

.feedback-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95em;
  resize: vertical;
  transition: border-color 0.2s;
}

.feedback-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: var(--text-dark);
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  background-color: #36a372;
  box-shadow: 0 2px 8px rgba(66, 184, 131, 0.3);
}

.btn-primary:disabled {
  background-color: #a5d8c0;
  cursor: not-allowed;
  box-shadow: none;
}
</style>