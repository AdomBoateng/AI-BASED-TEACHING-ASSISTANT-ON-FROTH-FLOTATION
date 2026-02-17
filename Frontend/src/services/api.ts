// FILE PATH: src/services/api.ts

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import type {
  ApiResponse,
  LoginResponse,
  SignupResponse,
  RagTurnRequest,
  RagTurnResponse,
  VideoToggleRequest,
  VideoToggleResponse,
  ModeSessionStartRequest,
  ModeSessionTurnRequest,
} from '@/types';

// ─── Cookie-based token store ─────────────────────────────────────────────────
// Cookies are readable by both the browser (client) AND the server (middleware).
// This is the key difference from localStorage which is browser-only.
// We use a simple, short-lived cookie — no HttpOnly so JS can read it for
// attaching to API request headers.

const COOKIE_NAME = 'meraki_token';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours in seconds

export const tokenStore = {
  get: (): string | null => {
    if (typeof document === 'undefined') return null; // SSR guard
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
      // Add Secure in production — omit for localhost dev
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  },

  clear: () => {
    if (typeof document === 'undefined') return;
    // Set Max-Age=0 to immediately expire the cookie
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
        } catch { /* ignore */ }
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
    // Write token to cookie immediately on successful login
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

  // ─── RAG / Tutor turn ─────────────────────────────────────────────────────
  sendMessage(payload: RagTurnRequest) {
    return this.request<RagTurnResponse>(API_ENDPOINTS.RAG_TURN, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Session preferences ──────────────────────────────────────────────────
  setVideoPreference(sessionId: string, prefersVideo: boolean) {
    return this.request<VideoToggleResponse>(
      API_ENDPOINTS.SESSION_VIDEO(sessionId),
      {
        method: 'PATCH',
        body: JSON.stringify({ prefers_video: prefersVideo } as VideoToggleRequest),
      }
    );
  }

  // ─── Mode-sessions ────────────────────────────────────────────────────────
  startModeSession(payload: ModeSessionStartRequest) {
    return this.request(API_ENDPOINTS.MODE_SESSION_START, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  sendModeSessionTurn(sessionId: string, payload: ModeSessionTurnRequest) {
    return this.request(API_ENDPOINTS.MODE_SESSION_TURN(sessionId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Voice upload ─────────────────────────────────────────────────────────
  uploadAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    return this.request<{ transcript: string }>('/whisper/transcribe', {
      method: 'POST',
      body: formData,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);