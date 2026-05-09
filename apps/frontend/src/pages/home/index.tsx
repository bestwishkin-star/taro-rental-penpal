import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import iconFind from '@/assets/icons/home/icon-find.png';
import iconShare from '@/assets/icons/home/icon-share.png';
import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { ActionCard } from './components/ActionCard';
import { HeroCarousel } from './components/HeroCarousel';


import './index.scss';

/** 首页：承载轮播入口、找房/发布快捷入口和底部提示信息。 */
export default function HomePage() {
  useDidShow(() => {
    // 每次回到首页时同步自定义 TabBar 的选中态。
    setTabBarSelected(0);
  });

  return (
    <PageShell>
      {/* 顶部轮播：展示主要租房场景和产品引导。 */}
      <HeroCarousel />

      {/* 核心操作区：进入找房列表或发布房源表单。 */}
      <View className="home-actions">
        <ActionCard
          icon={iconFind}
          label="我要找房"
          desc="浏览附近房源，找到心仪的住所"
          onClick={() => void Taro.switchTab({ url: '/pages/find/index' })}
        />
        <ActionCard
          icon={iconShare}
          label="我要分享"
          desc="发布你的房源信息，寻找合适的室友"
          onClick={() => void Taro.navigateTo({ url: '/pages/share/index' })}
        />
      </View>

      {/* 底部提示区：说明平台安全和沟通建议。 */}
      <View className="home-tips">
        <Text className="home-tips__title">温馨提示</Text>
        <Text className="home-tips__text">真实信息，安全交流，共建友好社区</Text>
      </View>
    </PageShell>
  );
}
