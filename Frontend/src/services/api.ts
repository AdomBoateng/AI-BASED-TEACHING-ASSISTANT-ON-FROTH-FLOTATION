import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import type {
  ApiResponse,
  LoginResponse,
  SignupResponse,
  RagTurnRequest,
  RagTurnResponse,
  VoiceTurnResponse,
  CreateSessionResponse,
  SessionDetailsResponse,
  SessionModeUpdateRequest,
  SessionModeUpdateResponse,
  VideoToggleRequest,
  VideoToggleResponse,
  EndSessionResponse,
  UserProfileResponse,
  AvatarSelectRequest,
  AvatarSelectResponse,
  SessionSurveyRequest,
  UserFeedbackRequest,
  FeedbackResponse,
  ModeSessionStartRequest,
  ModeSessionStartResponse,
  ModeSessionTurnRequest,
  ModeSessionTurnResponse,
} from '@/types';

// ─── Cookie-based token store (accessible by middleware) ─────────────────────
const COOKIE_NAME = 'meraki_token';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export const tokenStore = {
  get: (): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
  },

  set: (token: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      `Max-Age=${COOKIE_MAX_AGE}`,
      'Path=/',
      'SameSite=Lax',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  },

  clear: () => {
    if (typeof document === 'undefined') return;
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  },
};

// ─── API Client ───────────────────────────────────────────────────────────────
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private authHeaders(): Record<string, string> {
    const token = tokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit & { skipAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.skipAuth ? {} : this.authHeaders()),
        ...(options?.headers as Record<string, string>),
      };

      if (options?.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errBody = await response.json();
          message = errBody?.detail ?? message;
        } catch {
          /* ignore */
        }
        return { success: false, error: { code: String(response.status), message } };
      }

      const data: T = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('[ApiClient]', endpoint, error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ─── Health ───────────────────────────────────────────────────────────────
  healthCheck() {
    return this.request<{ status: string }>(API_ENDPOINTS.HEALTH, { skipAuth: true });
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const res = await this.request<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (res.success && res.data?.access_token) {
      tokenStore.set(res.data.access_token);
    }
    return res;
  }

  async signup(email: string, password: string) {
    return this.request<SignupResponse>(API_ENDPOINTS.AUTH_SIGNUP, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  }

  async forgotPassword(email: string, redirectTo?: string) {
    return this.request<{ status: string; message: string }>(
      API_ENDPOINTS.AUTH_FORGOT_PASSWORD,
      {
        method: 'POST',
        body: JSON.stringify({ email, redirect_to: redirectTo }),
        skipAuth: true,
      }
    );
  }

  logout() {
    tokenStore.clear();
  }

  // ─── RAG/Chat (Learn mode) ────────────────────────────────────────────────
  sendMessage(payload: RagTurnRequest) {
    return this.request<RagTurnResponse>(API_ENDPOINTS.RAG_TURN, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async uploadVoice(sessionId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    const url = `${API_ENDPOINTS.RAG_TURN_VOICE}?session_id=${sessionId}`;
    return this.request<VoiceTurnResponse>(url, {
      method: 'POST',
      body: formData,
    });
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────
  createSession() {
    return this.request<CreateSessionResponse>(API_ENDPOINTS.SESSIONS_CREATE, {
      method: 'POST',
    });
  }

  getSession(sessionId: string) {
    return this.request<SessionDetailsResponse>(API_ENDPOINTS.SESSIONS_GET(sessionId));
  }

  /**
   * Switch session mode on the backend (learn/practice/review).
   * Backend enforces: review → prefers_video forced to false.
   */
  switchSessionMode(sessionId: string, mode: 'learn' | 'practice' | 'review') {
    return this.request<SessionModeUpdateResponse>(API_ENDPOINTS.SESSIONS_MODE(sessionId), {
      method: 'PATCH',
      body: JSON.stringify({ current_mode: mode } as SessionModeUpdateRequest),
    });
  }

  setVideoPreference(sessionId: string, prefersVideo: boolean) {
    return this.request<VideoToggleResponse>(API_ENDPOINTS.SESSIONS_VIDEO(sessionId), {
      method: 'PATCH',
      body: JSON.stringify({ prefers_video: prefersVideo } as VideoToggleRequest),
    });
  }

  endSession(sessionId: string) {
    return this.request<EndSessionResponse>(API_ENDPOINTS.SESSIONS_END(sessionId), {
      method: 'POST',
    });
  }

  // ─── Mode Sessions (Practice / Review) ───────────────────────────────────

  /**
   * POST /mode-sessions/start
   * Creates a mode_session row, generates first prompt, returns mode_session_id + prompt.
   */
  startModeSession(payload: ModeSessionStartRequest) {
    return this.request<ModeSessionStartResponse>(API_ENDPOINTS.MODE_SESSIONS_START, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /mode-sessions/{mode_session_id}/turn
   * Submit student answer; get evaluation + optional next prompt.
   */
  modeSessionTurn(modeSessionId: string, payload: ModeSessionTurnRequest) {
    return this.request<ModeSessionTurnResponse>(
      API_ENDPOINTS.MODE_SESSIONS_TURN(modeSessionId),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * POST /mode-sessions/{mode_session_id}/end
   * Manually end a practice/review session.
   */
  endModeSession(modeSessionId: string) {
    return this.request<{ mode_session_id: string; status: string }>(
      API_ENDPOINTS.MODE_SESSIONS_END(modeSessionId),
      { method: 'POST' }
    );
  }

  /**
   * POST /mode-sessions/{mode_session_id}/turn/voice
   * Voice input for practice/review modes.
   */
  async uploadModeVoice(modeSessionId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    return this.request<ModeSessionTurnResponse & { transcript: string }>(
      API_ENDPOINTS.MODE_SESSIONS_TURN_VOICE(modeSessionId),
      { method: 'POST', body: formData }
    );
  }

  // ─── User Profile ─────────────────────────────────────────────────────────
  getUserProfile() {
    return this.request<UserProfileResponse>(API_ENDPOINTS.USERS_ME);
  }

  selectAvatar(avatarId: 'amy' | 'josh') {
    return this.request<AvatarSelectResponse>(API_ENDPOINTS.USERS_AVATAR, {
      method: 'POST',
      body: JSON.stringify({ avatar_id: avatarId } as AvatarSelectRequest),
    });
  }

  updateAvatar(avatarId: 'amy' | 'josh') {
    return this.request<AvatarSelectResponse>(API_ENDPOINTS.USERS_AVATAR_UPDATE, {
      method: 'PATCH',
      body: JSON.stringify({ avatar_id: avatarId } as AvatarSelectRequest),
    });
  }

  // ─── Feedback ─────────────────────────────────────────────────────────────
  submitSessionSurvey(payload: SessionSurveyRequest) {
    return this.request<FeedbackResponse>(API_ENDPOINTS.FEEDBACK_SESSION_SURVEY, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  submitUserFeedback(payload: UserFeedbackRequest) {
    return this.request<FeedbackResponse>(API_ENDPOINTS.FEEDBACK_USER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);