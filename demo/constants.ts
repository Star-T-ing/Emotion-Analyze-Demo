import { DemoScenario } from './types';

export const SYSTEM_INSTRUCTION = `
你是一个富有同情心、情商极高的人工智能助手，专门从事用户情感分析和情感支持。
你的目标是：
1. 识别用户潜在的情绪（例如：焦虑、喜悦、沮丧、悲伤）。
2. 肯定并接纳他们的感受。
3. 提供支持性、善意且具有建设性的回应。
4. 保持回答简洁（80字以内），语气温暖亲切，适合口语对话。
请全程使用中文（普通话）与用户交流。
`;

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'work-stress',
    title: '工作压力',
    description: '因截止日期而感到精疲力竭。',
    initialInput: "我觉得工作快把我淹没了。每次刚完成一个任务，又会冒出三个新任务。我真的好累。",
    icon: '💼'
  },
  {
    id: 'relationship-anxiety',
    title: '情感困扰',
    description: '对伴侣关系感到不确定。',
    initialInput: "我们昨天吵了一架，他今天一天都没回我消息。我很害怕他会离开我。",
    icon: '💔'
  },
  {
    id: 'achievement-joy',
    title: '分享喜悦',
    description: '庆祝个人的小成就。',
    initialInput: "我终于跑完了准备了半年的马拉松！虽然腿很疼，但我现在感觉像在云端一样开心！",
    icon: '🏆'
  },
  {
    id: 'study-pressure',
    title: '学业焦虑',
    description: '担心即将到来的考试。',
    initialInput: "下周就是期末考了，但我感觉自己什么都记不住，书也看不进去，心跳好快，我该怎么办？",
    icon: '📚'
  },
  {
    id: 'loneliness',
    title: '孤独感',
    description: '独自在异乡打拼的孤独。',
    initialInput: "刚搬到这个新城市，没有朋友，周末只能一个人待在家里刷手机，感觉世界好大，却只有我一个人。",
    icon: '🍂'
  }
];