import { createContext, useContext, useState } from 'react';

import type { LoginResponse } from '@shared/contracts/auth';
import type { UserProfile } from '@shared/contracts/user';
import type { PropsWithChildren } from 'react';

import { getToken, removeToken, setToken } from '@/shared/api/http';
import { frontendEnv } from '@/shared/config/env';

interface AppStoreValue {
  apiBaseUrl: string;
  isLoggedIn: boolean;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  handleLoginSuccess: (data: LoginResponse) => void;
  handleLogout: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());

  const handleLoginSuccess = (data: LoginResponse) => {
    setToken(data.token);
    setIsLoggedIn(true);
    setProfile({
      id: data.user.id,
      nickname: data.user.nickname,
      avatarUrl: data.user.avatarUrl,
      budget: '',
      city: '',
      moveInDate: '',
      preferredDistrict: '',
      roommateExpectation: '',
      verified: false
    });
  };

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    setProfile(null);
  };

  return (
    <AppStoreContext.Provider
      value={{
        apiBaseUrl: frontendEnv.apiBaseUrl,
        isLoggedIn,
        profile,
        setProfile,
        handleLoginSuccess,
        handleLogout
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider.');
  }

  return context;
}
