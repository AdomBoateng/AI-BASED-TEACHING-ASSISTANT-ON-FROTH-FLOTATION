import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserPreferences } from '@/types';
import { tokenStore } from '@/services/api';

export interface UserState {
  user: User | null;
  preferences: UserPreferences;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setAuth: (user: User, accessToken: string) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
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
        prefersVideo: false,
      },
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null }),

      setAuth: (user, accessToken) => {
        // Write token to cookie — readable by middleware on next request
        tokenStore.set(accessToken);
        set({ user, isAuthenticated: true });
      },

      setPreferences: (newPrefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPrefs },
        })),

      setIsLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        tokenStore.clear();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'meraki-user-store',
      // Only persist the user object and preferences.
      // isAuthenticated is re-derived from the cookie on rehydration.
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Cookie is readable immediately — use it to set isAuthenticated
        const token = tokenStore.get();
        state.isAuthenticated = !!(token && state.user);
        if (!token) state.user = null; // clear stale user if cookie expired
      },
    }
  )
);