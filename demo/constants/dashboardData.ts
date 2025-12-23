// Static demo data for Emotional Statistics Dashboard
// This data is used for demonstration purposes without real-time processing

export interface TrajectoryDataPoint {
  messageNumber: number;
  valence: number; // 0-100 scale
  emotion: string;
  emotionColor: string;
}

export interface EmotionDistribution {
  anxiety: number;      // 焦虑
  confusion: number;    // 困惑
  frustration: number;  // 沮丧
  curiosity: number;    // 好奇
  confidence: number;   // 自信
  excitement: number;   // 兴奋
}

export interface CognitiveState {
  engagement: number;   // 投入度
  stability: number;    // 稳定性
  arousal: number;      // 唤醒度
  control: number;      // 掌控感
  resilience: number;   // 抗压力
  excitement: number;   // 兴奋度
}

// Emotion color mapping constants
export const EMOTION_COLORS = {
  '焦虑': '#f59e0b',    // amber-500
  '困惑': '#8b5cf6',    // violet-500
  '沮丧': '#ef4444',    // red-500
  '好奇': '#3b82f6',    // blue-500
  '自信': '#10b981',    // emerald-500
  '兴奋': '#ec4899',    // pink-500
};

// Emotional trajectory data with 10 data points showing varied emotions and valence progression
export const DEMO_TRAJECTORY_DATA: TrajectoryDataPoint[] = [
  { messageNumber: 1, valence: 25, emotion: '焦虑', emotionColor: '#f59e0b' },
  { messageNumber: 2, valence: 18, emotion: '沮丧', emotionColor: '#ef4444' },
  { messageNumber: 3, valence: 32, emotion: '困惑', emotionColor: '#8b5cf6' },
  { messageNumber: 4, valence: 57, emotion: '好奇', emotionColor: '#3b82f6' },
  { messageNumber: 5, valence: 79, emotion: '自信', emotionColor: '#10b981' },
  { messageNumber: 6, valence: 85, emotion: '兴奋', emotionColor: '#ec4899' },
];

// Emotion distribution data for radar chart - adjusted based on valence trajectory
export const DEMO_EMOTION_DISTRIBUTION: EmotionDistribution = {
  anxiety: 35,      // 焦虑 - reduced as valence improves over time
  confusion: 50,    // 困惑 - lower as understanding develops
  frustration: 65,  // 沮丧 - decreased with positive progression
  curiosity: 58,    // 好奇 - high as engagement increases
  confidence: 82,   // 自信 - increased with positive valence trend
  excitement: 85,   // 兴奋 - highest reflecting final positive state
};

// Cognitive state data for radar chart - reflecting overall positive trajectory
export const DEMO_COGNITIVE_STATE: CognitiveState = {
  engagement: 82,   // 投入度 - high due to curiosity and positive progression
  arousal: 88,      // 唤醒度 - elevated with excitement and engagement
  control: 72,      // 掌控感 - increased with confidence growth
  stability: 65,    // 稳定性 - improved as emotions stabilize positively
  resilience: 68,   // 抗压力 - strengthened through positive experience
  excitement: 85,   // 兴奋度 - matches high final valence state
};
