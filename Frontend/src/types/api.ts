export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface SignupResponse {
  user: {
    id?: string;
    email?: string;
  };
  session: {
    access_token?: string | null;
  };
  note?: string;
}

// ─── RAG/Chat ─────────────────────────────────────────────────────────────────
export interface RagTurnRequest {
  session_id: string;
  mode: 'learn';  // Only "learn" allowed in /rag/turn
  message: string;
}

export interface RagTurnResponse {
  mode: 'learn';
  response: string;
  response_format: 'text' | 'video';
  video_url?: string | null;
  audio_url?: string | null;  // NEW: audio URL when video is generated
  did_payload?: any;          // Optional D-ID raw response
}

export interface VoiceTurnResponse extends RagTurnResponse {
  transcript: string;  // The transcribed text from audio
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export interface CreateSessionResponse {
  session_id: string;
  current_mode: 'learn' | 'practice' | 'review';
  prefers_video: boolean;
  started_at: string;
}

export interface SessionDetailsResponse {
  session_id: string;
  current_mode: 'learn' | 'practice' | 'review';
  prefers_video: boolean;
  started_at: string;
  ended_at?: string | null;
}

export interface SessionModeUpdateRequest {
  current_mode: 'learn' | 'practice' | 'review';
}

export interface SessionModeUpdateResponse {
  session_id: string;
  current_mode: 'learn' | 'practice' | 'review';
  prefers_video: boolean;  // Will be false if mode is "review"
}

export interface VideoToggleRequest {
  prefers_video: boolean;
}

export interface VideoToggleResponse {
  session_id: string;
  prefers_video: boolean;
}

export interface EndSessionResponse {
  session_id: string;
  status: 'ended';
  ended_at: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfileResponse {
  id: string;
  email: string;
  role: string;
  avatar_id: string;
  avatar_provider: string;
  avatar_gender: 'male' | 'female';
  voice_provider: string;
  voice_id: string;
  voice_gender: 'male' | 'female';
  created_at: string;
}

export interface AvatarSelectRequest {
  avatar_id: 'amy' | 'josh';
}

export interface AvatarSelectResponse {
  status: 'ok';
  avatar_id: string;
  voice_id: string;
  did_presenter_id: string;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export interface SessionSurveyRequest {
  session_id: string;
  clarity_rating: number;      // 1-5
  helpfulness_rating: number;  // 1-5
  confidence_rating: number;   // 1-5
  overall_rating: number;      // 1-5
}

export interface UserFeedbackRequest {
  session_id?: string | null;
  feedback_type: 'bug' | 'suggestion' | 'content' | 'ux' | 'other';
  message: string;
}

export interface FeedbackResponse {
  status: 'ok';
  id?: string | null;
}

// ─── Mode Sessions (Practice/Review) ──────────────────────────────────────────
// These are inferred from models.py but routes not provided yet
export interface ModeSessionStartRequest {
  session_id: string;
  mode: 'practice' | 'review';
  session_type: string;
  difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
  total_items?: number | null;
}

export interface ModeSessionTurnRequest {
  message: string;
}