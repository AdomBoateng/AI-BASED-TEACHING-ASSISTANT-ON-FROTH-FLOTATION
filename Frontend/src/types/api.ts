export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
}

export interface ChatMessagePayload {
  conversationId: string;
  message: string;
  audioUrl?: string;
  timestamp: number;
}

export interface VideoResponsePayload {
  conversationId: string;
  messageId: string;
  videoUrl: string;
  hlsUrl?: string;
  subtitles: SubtitlePayload[];
  duration: number;
}

export interface SubtitlePayload {
  start: number;
  end: number;
  text: string;
}
