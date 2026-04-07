import React from 'react';

import { useAuthStore } from './auth-store';

import type { PropsWithChildren } from 'react';

import { frontendEnv } from '@/shared/config/env';

/**
 * @deprecated 使用 useAuthStore 替代
 * 保留此 hook 是为了向后兼容，后续迁移完成后删除
 */
export function useAppStore() {
  const auth = useAuthStore();
  return {
    apiBaseUrl: frontendEnv.apiBaseUrl,
    ...auth
  };
}

/**
 * @deprecated Zustand 不需要 Provider，保留仅为兼容旧代码
 */
export function AppStoreProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
