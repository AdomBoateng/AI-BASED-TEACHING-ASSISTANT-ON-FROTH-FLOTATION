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
export const MAX_VIDEO_DURATION = 3600000; // 1 hour in ms
export const DEFAULT_SUBTITLE_SIZE = 16;

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  // Auth endpoints
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_SESSION: '/api/auth/session',
  // Chat endpoints
  CHAT_MESSAGE: '/api/chat',
  CHAT_CONVERSATIONS: '/api/conversations',
  CHAT_CONVERSATION_DETAIL: (id: string) => `/api/conversations/${id}`,
  // User endpoints
  USER_PROFILE: '/api/user/profile',
  USER_PREFERENCES: '/api/user/preferences',
  // Upload endpoints
  UPLOAD_AUDIO: '/api/upload/audio',
  UPLOAD_VIDEO: '/api/upload/video',
};

// WebSocket Events
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  VIDEO_CHUNK_READY: 'video_chunk_ready',
  SUBTITLES_READY: 'subtitles_ready',
  RESPONSE_COMPLETE: 'response_complete',
  ERROR: 'error',
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

// Success Messages
export const SUCCESS_MESSAGES = {
  MESSAGE_SENT: 'Message sent successfully!',
  CONVERSATION_CREATED: 'Conversation created successfully!',
  PREFERENCES_UPDATED: 'Preferences updated successfully!',
  LOGGED_OUT: 'You have been logged out.',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Delays (in milliseconds)
export const DEBOUNCE_DELAY = 300;
export const TOAST_DURATION = 3000;
export const VIDEO_LOAD_TIMEOUT = 30000; // 30 seconds
