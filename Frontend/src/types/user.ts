export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt?: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: string;
  subtitlesEnabled: boolean;
  autoPlayVideo: boolean;
  prefersVideo: boolean;   // mirrors backend sessions.prefers_video
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}