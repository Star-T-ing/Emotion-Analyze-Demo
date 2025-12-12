export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  audioUrl?: string; // For model responses or user audio playback
  isAudioMessage?: boolean; // If the user input was audio
  timestamp: number;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  initialInput: string;
  icon: string;
}

export interface GeminiResponse {
  text: string;
  audioBase64?: string;
}