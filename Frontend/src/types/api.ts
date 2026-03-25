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

// ─── RAG/Chat (Learn mode) ────────────────────────────────────────────────────
export interface RagTurnRequest {
  session_id: string;
  mode: 'learn';
  message: string;
}

export interface RagTurnResponse {
  mode: 'learn';
  response: string;
  response_format: 'text' | 'video';
  video_url?: string | null;
  subtitle_url?: string | null;
  audio_url?: string | null;
  did_payload?: unknown;
}

export interface VoiceTurnResponse extends RagTurnResponse {
  transcript: string;
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
  prefers_video: boolean;
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
  clarity_rating: number;
  helpfulness_rating: number;
  confidence_rating: number;
  overall_rating: number;
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

// ─── Mode Sessions (Practice / Review) ───────────────────────────────────────

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

// Delivery block returned by backend for video/audio
export interface DeliveryBlock {
  response_format: 'text' | 'video';
  video_url?: string | null;
  audio_url?: string | null;
  subtitle_url?: string | null;
}

// What the backend returns from POST /mode-sessions/start
export interface ModeSessionStartResponse {
  mode_session_id: string;
  mode: 'practice' | 'review';
  session_type: string;
  difficulty: string;
  prompt: string;
  // delivery fields (practice can have video; review is always text)
  response_format: 'text' | 'video';
  video_url?: string | null;
  audio_url?: string | null;
  subtitle_url?: string | null;
}

// Evaluation object inside a turn response
export interface PracticeEvaluation {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  feedback: string;
  missing_points: string[];
  unsupported_claims: string[];
}

export interface ReviewEvaluation {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  rubric_level: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
  feedback: string;
  missing_points: string[];
  unsupported_claims: string[];
  // Present for MCQ and fill_blank item types
  correct_answer?: string;
}

// Practice turn response
export interface PracticeTurnResponse {
  mode: 'practice';
  type: 'evaluation' | 'completed';
  evaluation: PracticeEvaluation;
  // evaluation delivery (video possible)
  delivery?: DeliveryBlock;
  // present when type === 'evaluation'
  next_prompt?: string;
  next_delivery?: DeliveryBlock;
  // present when type === 'completed'
  key_learning_points?: string[];
  summary?: string;
  key_delivery?: DeliveryBlock;
}

// Review turn response
export interface ReviewTurnResponse {
  mode: 'review';
  type: 'evaluation' | 'completed';
  evaluation: ReviewEvaluation;
  response_format: 'text';
  video_url: null;
  // present when type === 'evaluation'
  next_prompt?: string;
  next_difficulty?: string;
  // transcript present when called via voice endpoint
  transcript?: string;
}

export type ModeSessionTurnResponse = PracticeTurnResponse | ReviewTurnResponse;