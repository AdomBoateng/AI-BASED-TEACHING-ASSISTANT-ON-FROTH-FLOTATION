// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// Chat Configuration
export const MAX_MESSAGE_LENGTH = 5000;
export const MIN_MESSAGE_LENGTH = 1;
export const MAX_CONVERSATION_TITLE_LENGTH = 200;

// Voice Recording Configuration
export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export const AUDIO_MIME_TYPE = 'audio/wav';
export const MAX_RECORDING_DURATION = 300000; // 5 minutes in ms

// Video Configuration
export const VIDEO_MIME_TYPES = ['video/mp4', 'application/x-mpegURL'];
export const MAX_VIDEO_DURATION = 3600000;
export const DEFAULT_SUBTITLE_SIZE = 16;

// ─── Actual Backend API Endpoints ───────────────────────────────────────────
export const API_ENDPOINTS = {
  HEALTH: '/health',

  // Auth  →  /auth/*
  AUTH_LOGIN: '/auth/login',
  AUTH_SIGNUP: '/auth/signup',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_GOOGLE_URL: '/auth/google/url',
  AUTH_GOOGLE_CALLBACK: '/auth/google/callback',

  // RAG / tutor turn  →  /rag/turn
  RAG_TURN: '/rag/turn',

  // Sessions  →  /sessions/*
  SESSION_VIDEO: (sessionId: string) => `/sessions/${sessionId}/video`,

  // Mode-sessions  →  /mode-sessions/*  (practice & review)
  MODE_SESSION_START: '/mode-sessions/start',
  MODE_SESSION_TURN: (sessionId: string) => `/mode-sessions/${sessionId}/turn`,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_MESSAGE: 'Invalid message. Please try again.',
  VIDEO_GENERATION_FAILED: 'Failed to generate video response. Please try again.',
  AUDIO_RECORDING_FAILED: 'Failed to record audio. Please check your microphone.',
  PERMISSION_DENIED: 'Permission denied. Please allow microphone access.',
  AUTH_REQUIRED: 'Authentication required. Please log in.',
  CONVERSATION_NOT_FOUND: 'Conversation not found.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
};

export const SUCCESS_MESSAGES = {
  MESSAGE_SENT: 'Message sent successfully!',
  CONVERSATION_CREATED: 'New session started!',
  PREFERENCES_UPDATED: 'Preferences updated successfully!',
  LOGGED_OUT: 'You have been logged out.',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Delays (in milliseconds)
export const DEBOUNCE_DELAY = 300;
export const TOAST_DURATION = 3000;
export const VIDEO_LOAD_TIMEOUT = 30000;