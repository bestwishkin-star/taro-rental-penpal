import type { LoginResponse } from '@shared/contracts/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: (key: string) => storage.get(key) ?? '',
    setStorageSync: (key: string, value: string) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key)
  }
}));

vi.mock('@/shared/api/http', () => ({
  getToken: () => null,
  setToken: vi.fn(),
  removeToken: vi.fn()
}));

import { useAuthStore } from './auth-store';

const loginPayload: LoginResponse = {
  token: 'token-123',
  user: {
    id: 'user-1',
    nickname: 'Milo',
    avatarUrl: 'https://cdn.test/avatar.png'
  }
};

describe('useAuthStore', () => {
  beforeEach(() => {
    storage.clear();
    useAuthStore.setState({
      isLoggedIn: false,
      profile: null,
      profileStats: { publishCount: 0, favoriteCount: 0, browseCount: 0 }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes stats on login success', () => {
    useAuthStore.getState().handleLoginSuccess(loginPayload);

    expect(useAuthStore.getState().profile?.nickname).toBe('Milo');
    expect(useAuthStore.getState().profileStats).toEqual({
      publishCount: 0,
      favoriteCount: 0,
      browseCount: 0
    });
  });

  it('patches profile fields without dropping untouched values', () => {
    useAuthStore.getState().handleLoginSuccess(loginPayload);

    useAuthStore.getState().patchProfile({
      nickname: 'Milo Chen',
      city: 'Shanghai'
    });

    expect(useAuthStore.getState().profile).toMatchObject({
      id: 'user-1',
      nickname: 'Milo Chen',
      city: 'Shanghai',
      avatarUrl: 'https://cdn.test/avatar.png'
    });
  });

  it('patches profile stats incrementally', () => {
    useAuthStore.getState().setProfileStats({
      publishCount: 1,
      favoriteCount: 2,
      browseCount: 3
    });

    useAuthStore.getState().patchProfileStats({ favoriteCount: 5 });

    expect(useAuthStore.getState().profileStats).toEqual({
      publishCount: 1,
      favoriteCount: 5,
      browseCount: 3
    });
  });

  it('clears profile and resets stats on logout', () => {
    useAuthStore.getState().handleLoginSuccess(loginPayload);
    useAuthStore.getState().setProfileStats({
      publishCount: 4,
      favoriteCount: 5,
      browseCount: 6
    });

    useAuthStore.getState().handleLogout();

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().profile).toBeNull();
    expect(useAuthStore.getState().profileStats).toEqual({
      publishCount: 0,
      favoriteCount: 0,
      browseCount: 0
    });
  });
});
