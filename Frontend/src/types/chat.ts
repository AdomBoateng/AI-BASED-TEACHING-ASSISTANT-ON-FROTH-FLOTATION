export type MessageRole = 'user' | 'assistant';
export type TutorMode = 'learn' | 'practice' | 'review';
export type ResponseFormat = 'text' | 'video';

// ─── Message ─────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  sessionId: string;         // maps to backend session_id
  role: MessageRole;
  content: string;           // tutor_response text (or user_input)
  responseFormat: ResponseFormat;
  videoUrl?: string | null;  // populated when response_format === 'video'
  mode: TutorMode;
  timestamp: Date;
}

// ─── Video (used by VideoPlayer) ─────────────────────────────────────────────
export interface VideoResponse {
  videoUrl: string;
  status: 'generating' | 'ready' | 'error';
  // Subtitles are NOT returned by the backend yet — kept for future use
  subtitles?: Subtitle[];
  duration?: number;
}

export interface Subtitle {
  id: string;
  start: number; // milliseconds
  end: number;   // milliseconds
  text: string;
}

// ─── Session (replaces Conversation — matches backend "sessions" table) ───────
export interface Session {
  id: string;                // UUID generated on the frontend
  title: string;             // derived from first message
  mode: TutorMode;
  prefersVideo: boolean;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  previewMessage?: string;   // snippet of last message
}

// Legacy alias so existing components don't break during migration
export type Conversation = Session;

// ─── Chat request/response (frontend-level, wraps RagTurnRequest) ─────────────
export interface ChatRequest {
  sessionId: string;
  message: string;
  mode?: TutorMode;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  tutorText: string;
  responseFormat: ResponseFormat;
  videoUrl?: string | null;
}