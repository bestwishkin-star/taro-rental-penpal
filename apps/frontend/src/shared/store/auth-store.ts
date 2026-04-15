import type { LoginResponse } from '@shared/contracts/auth';
import type { UserProfile } from '@shared/contracts/user';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getToken, removeToken, setToken } from '@/shared/api/http';

import { taroStorage } from './taro-storage';

interface ProfileStats {
  publishCount: number;
  favoriteCount: number;
  browseCount: number;
}

interface AuthState {
  isLoggedIn: boolean;
  profile: UserProfile | null;
  profileStats: ProfileStats;
}

interface AuthActions {
  setProfile: (profile: UserProfile | null) => void;
  patchProfile: (partial: Partial<UserProfile>) => void;
  setProfileStats: (stats: ProfileStats) => void;
  patchProfileStats: (partial: Partial<ProfileStats>) => void;
  handleLoginSuccess: (data: LoginResponse) => void;
  handleLogout: () => void;
}

type AuthStore = AuthState & AuthActions;

const EMPTY_STATS: ProfileStats = {
  publishCount: 0,
  favoriteCount: 0,
  browseCount: 0
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isLoggedIn: !!getToken(),
      profile: null,
      profileStats: EMPTY_STATS,

      setProfile: (profile) => set({ profile }),

      patchProfile: (partial) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : state.profile
        })),

      setProfileStats: (profileStats) => set({ profileStats }),

      patchProfileStats: (partial) =>
        set((state) => ({
          profileStats: { ...state.profileStats, ...partial }
        })),

      handleLoginSuccess: (data) => {
        setToken(data.token);
        set({
          isLoggedIn: true,
          profile: {
            id: data.user.id,
            nickname: data.user.nickname,
            avatarUrl: data.user.avatarUrl,
            budget: '',
            city: '',
            moveInDate: '',
            preferredDistrict: '',
            roommateExpectation: '',
            verified: false
          },
          profileStats: EMPTY_STATS
        });
      },

      handleLogout: () => {
        removeToken();
        set({
          isLoggedIn: false,
          profile: null,
          profileStats: EMPTY_STATS
        });
      }
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => taroStorage),
      // Persist profile data and stats; the token remains the login source of truth.
      partialize: (state): Pick<AuthStore, 'profile' | 'profileStats'> => ({
        profile: state.profile,
        profileStats: state.profileStats
      })
    }
  )
);
