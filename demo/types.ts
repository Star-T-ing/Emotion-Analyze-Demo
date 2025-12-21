export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

// 聊天消息的结构
export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  audioUrl?: string;
  isAudioMessage?: boolean;
  isAudioGenerating?: boolean;
  timestamp: number;
  analysis?: string;
}

// 示例场景的结构
export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  initialInput?: string;
  demoAudioUrl?: string;
  icon: string;
  exampleTitle?: string;
}