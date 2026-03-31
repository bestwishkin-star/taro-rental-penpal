import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { taroStorage } from './taro-storage';

import type { LoginResponse } from '@shared/contracts/auth';
import type { UserProfile } from '@shared/contracts/user';

import { getToken, removeToken, setToken } from '@/shared/api/http';

interface AuthState {
  isLoggedIn: boolean;
  profile: UserProfile | null;
}

interface AuthActions {
  setProfile: (profile: UserProfile | null) => void;
  handleLoginSuccess: (data: LoginResponse) => void;
  handleLogout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isLoggedIn: !!getToken(),
      profile: null,

      setProfile: (profile) => set({ profile }),

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
          }
        });
      },

      handleLogout: () => {
        removeToken();
        set({ isLoggedIn: false, profile: null });
      }
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => taroStorage),
      // 只持久化用户信息，isLoggedIn 通过 token 判断恢复
      partialize: (state): Pick<AuthStore, 'profile'> => ({
        profile: state.profile
      })
    }
  )
);
