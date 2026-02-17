import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserPreferences } from '@/types';

export interface UserState {
  user: User | null;
  preferences: UserPreferences;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      preferences: {
        theme: 'dark',
        language: 'en',
        subtitlesEnabled: true,
        autoPlayVideo: true,
      },
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),

      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences,
          },
        })),

      setIsAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),

      setIsLoading: (loading) =>
        set({ isLoading: loading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'meraki-user-store',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
