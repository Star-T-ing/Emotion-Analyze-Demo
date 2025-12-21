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
  { messageNumber: 1, valence: 45, emotion: '焦虑', emotionColor: '#f59e0b' },
  { messageNumber: 2, valence: 38, emotion: '沮丧', emotionColor: '#ef4444' },
  { messageNumber: 3, valence: 42, emotion: '困惑', emotionColor: '#8b5cf6' },
  { messageNumber: 4, valence: 55, emotion: '好奇', emotionColor: '#3b82f6' },
  { messageNumber: 5, valence: 62, emotion: '好奇', emotionColor: '#3b82f6' },
  { messageNumber: 6, valence: 70, emotion: '自信', emotionColor: '#10b981' },
  { messageNumber: 7, valence: 75, emotion: '兴奋', emotionColor: '#ec4899' },
  { messageNumber: 8, valence: 68, emotion: '自信', emotionColor: '#10b981' },
];

// Emotion distribution data for radar chart
export const DEMO_EMOTION_DISTRIBUTION: EmotionDistribution = {
  anxiety: 65,      // 焦虑
  confusion: 45,    // 困惑
  frustration: 55,  // 沮丧
  curiosity: 72,    // 好奇
  confidence: 68,   // 自信
  excitement: 80,   // 兴奋
};

// Cognitive state data for radar chart
export const DEMO_COGNITIVE_STATE: CognitiveState = {
  engagement: 75,   // 投入度
  stability: 58,    // 稳定性
  arousal: 70,      // 唤醒度
  control: 62,      // 掌控感
  resilience: 55,   // 抗压力
  excitement: 78,   // 兴奋度
};
