export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_SIGNUP: '/auth/signup',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',

  // RAG/Chat (Learn mode only)
  RAG_TURN: '/rag/turn',
  RAG_TURN_VOICE: '/rag/turn/voice',

  // Sessions
  SESSIONS_CREATE: '/sessions/',
  SESSIONS_GET: (id: string) => `/sessions/${id}`,
  SESSIONS_MODE: (id: string) => `/sessions/${id}/mode`,
  SESSIONS_VIDEO: (id: string) => `/sessions/${id}/video`,
  SESSIONS_END: (id: string) => `/sessions/${id}/end`,

  // Users
  USERS_ME: '/users/me',
  USERS_AVATAR: '/users/avatar',
  USERS_AVATAR_UPDATE: '/users/me/avatar',

  // Feedback
  FEEDBACK_SESSION_SURVEY: '/feedback/session-survey',
  FEEDBACK_USER: '/feedback/user-feedback',

  // Mode Sessions (Practice / Review)
  MODE_SESSIONS_START: '/mode-sessions/start',
  MODE_SESSIONS_TURN: (id: string) => `/mode-sessions/${id}/turn`,
  MODE_SESSIONS_TURN_VOICE: (id: string) => `/mode-sessions/${id}/turn/voice`,
  MODE_SESSIONS_END: (id: string) => `/mode-sessions/${id}/end`,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  SESSION_NOT_FOUND: 'Session not found.',
  UNAUTHORIZED: 'Unauthorized. Please log in.',
  REVIEW_MODE_NO_VIDEO: 'Review mode is text-only. Video responses are disabled.',
} as const;

export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
} as const;

// ─── Mode session config ──────────────────────────────────────────────────────
export const SESSION_TYPES = [
  { value: 'flotation_basics', label: 'Flotation Basics' },
  { value: 'reagents', label: 'Reagents & Chemistry' },
  { value: 'process_variables', label: 'Process Variables' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'surface_chemistry', label: 'Surface Chemistry' },
] as const;

export const DIFFICULTY_LEVELS = ['Basic', 'Intermediate', 'Advanced'] as const;