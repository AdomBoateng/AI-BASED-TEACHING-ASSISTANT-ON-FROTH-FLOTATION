export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: string;
  subtitlesEnabled: boolean;
  autoPlayVideo: boolean;
}

export interface AuthSession {
  user: User;
  expires: string;
}
