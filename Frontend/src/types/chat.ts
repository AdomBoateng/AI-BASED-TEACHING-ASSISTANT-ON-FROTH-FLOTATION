export type TutorMode = 'learn' | 'practice' | 'review';
export type ResponseFormat = 'text' | 'video';

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  responseFormat?: ResponseFormat;
  videoUrl?: string | null;
  audioUrl?: string | null;  // NEW: audio URL from backend
  mode: TutorMode;
  timestamp: Date;
}

export interface Session {
  id: string;
  title: string;
  mode: TutorMode;
  currentMode?: TutorMode;  // NEW: tracks active mode (can switch during session)
  prefersVideo: boolean;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  previewMessage?: string;
  startedAt?: string;
  endedAt?: string | null;
}

export interface VideoResponse {
  videoUrl: string;
  audioUrl?: string;  // NEW: audio URL
  duration: number;
  subtitles: Subtitle[];
}

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}