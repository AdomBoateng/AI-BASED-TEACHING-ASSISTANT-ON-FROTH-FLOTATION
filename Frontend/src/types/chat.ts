export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string; // Text content for user messages
  audioUrl?: string; // URL to audio file if voice input
  timestamp: Date;
}

export interface VideoResponse {
  videoUrl: string;
  duration: number;
  subtitles: Subtitle[];
  status: 'generating' | 'ready' | 'error';
}

export interface Subtitle {
  id: string;
  start: number; // milliseconds
  end: number; // milliseconds
  text: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  previewMessage?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  videoResponse: VideoResponse;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
  audioUrl?: string;
}
