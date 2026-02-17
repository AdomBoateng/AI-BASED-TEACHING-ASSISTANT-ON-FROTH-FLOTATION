// ─── Generic wrapper ────────────────────────────────────────────────────────
// The backend does NOT wrap responses in { success, data } — it returns data
// directly (or throws an HTTPException). We keep ApiResponse only as an
// internal helper for the client's error boundary.
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
}

export interface SignupResponse {
  user: AuthUser;
  session: {
    access_token: string | null;
    refresh_token: string | null;
    expires_in: number | null;
  };
  note: string;
}

// ─── RAG / Tutor turn  (/rag/turn) ───────────────────────────────────────────
// Request body
export interface RagTurnRequest {
  session_id: string;
  mode: 'learn';     // only 'learn' goes to /rag/turn
  message: string;
}

// Response — backend returns { mode, response, ...delivery }
// delivery comes from maybe_generate_video():
//   text-only  →  { response_format: "text" }
//   video      →  { response_format: "video", video_url: string }
export interface RagTurnResponse {
  mode: 'learn';
  response: string;           // tutor text
  response_format: 'text' | 'video';
  video_url?: string | null;
}

// ─── Session video toggle  (PATCH /sessions/:id/video) ───────────────────────
export interface VideoToggleRequest {
  prefers_video: boolean;
}

export interface VideoToggleResponse {
  session_id: string;
  prefers_video: boolean;
}

// ─── Mode-sessions (practice / review) ───────────────────────────────────────
export interface ModeSessionStartRequest {
  session_id: string;
  mode: 'practice' | 'review';
  session_type: string;
  difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
  total_items?: number;
}

export interface ModeSessionTurnRequest {
  message: string;
}

// ─── Paginated (utility) ─────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}