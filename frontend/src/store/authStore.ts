import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, ParticipantProfile } from '@/types';

interface AuthStore {
  user: User | null;
  profile: ParticipantProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  setAuth: (user: User, profile: ParticipantProfile | null, tokens: { accessToken: string; refreshToken: string }) => void;
  setProfile: (profile: ParticipantProfile) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setAuth: (user, profile, tokens) => {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        set({ user, profile, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      },

      setProfile: (profile) => set({ profile }),

      setUser: (user) => set({ user }),

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, profile: null, accessToken: null, refreshToken: null });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'acm-auth',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
