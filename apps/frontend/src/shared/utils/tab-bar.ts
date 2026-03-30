import Taro from '@tarojs/taro';

export const TAB_CHANGE_EVENT = 'custom-tab-bar:setSelected';

/** Call from tab pages in useDidShow to sync active tab */
export function setTabBarSelected(index: number) {
  Taro.eventCenter.trigger(TAB_CHANGE_EVENT, index);
}
