import { useEffect, useState } from 'react';

import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';

import homeIcon from '@/assets/icons/home.png';
import homeActiveIcon from '@/assets/icons/home-active.png';
import findIcon from '@/assets/icons/find.png';
import findActiveIcon from '@/assets/icons/find-active.png';
import profileIcon from '@/assets/icons/profile.png';
import profileActiveIcon from '@/assets/icons/profile-active.png';

import './index.scss';

const TAB_CHANGE_EVENT = 'custom-tab-bar:setSelected';

const tabs = [
  {
    pagePath: '/pages/home/index',
    label: '首页',
    icon: homeIcon,
    activeIcon: homeActiveIcon
  },
  {
    pagePath: '/pages/find/index',
    label: '找房',
    icon: findIcon,
    activeIcon: findActiveIcon
  },
  {
    pagePath: '/pages/profile/index',
    label: '我的',
    icon: profileIcon,
    activeIcon: profileActiveIcon
  },
];

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handler = (index: number) => setSelected(index);
    Taro.eventCenter.on(TAB_CHANGE_EVENT, handler);
    return () => {
      Taro.eventCenter.off(TAB_CHANGE_EVENT, handler);
    };
  }, []);

  const handleSwitch = (index: number) => {
    const tab = tabs[index];
    setSelected(index);
    Taro.switchTab({ url: tab.pagePath });
  };

  return (
    <View className="custom-tab-bar">
      {tabs.map((tab, index) => {
        const isActive = selected === index;
        return (
          <View
            key={tab.pagePath}
            className={`custom-tab-bar__item${isActive ? ' custom-tab-bar__item--active' : ''}`}
            onClick={() => handleSwitch(index)}
          >
            <Image
              className="custom-tab-bar__icon"
              src={isActive ? tab.activeIcon : tab.icon}
              mode="aspectFit"
            />
            <Text className="custom-tab-bar__label">{tab.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
