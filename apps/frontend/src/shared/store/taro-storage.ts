import Taro from '@tarojs/taro';
import type { StateStorage } from 'zustand/middleware';

/** Zustand persist 的 Taro Storage 适配器。 */
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
