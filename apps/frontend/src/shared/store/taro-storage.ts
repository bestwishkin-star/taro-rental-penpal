import Taro from '@tarojs/taro';

import type { StateStorage } from 'zustand/middleware';

/**
 * Zustand persist 中间件的 Taro 存储适配器
 * 微信小程序不支持 localStorage，用 Taro.Storage 替代
 */
export const taroStorage: StateStorage = {
  getItem: (name) => {
    const value = Taro.getStorageSync<string>(name);
    return value || null;
  },
  setItem: (name, value) => {
    Taro.setStorageSync(name, value);
  },
  removeItem: (name) => {
    Taro.removeStorageSync(name);
  }
};
