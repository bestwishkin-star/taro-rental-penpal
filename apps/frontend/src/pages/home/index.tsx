import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { ActionCard } from './components/ActionCard';
import { HeroCarousel } from './components/HeroCarousel';

import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import './index.scss';

export default function HomePage() {
  useDidShow(() => {
    setTabBarSelected(0);
  });

  return (
    <PageShell>
      <HeroCarousel />

      <View className="home-actions">
        <ActionCard
          icon="🏠"
          label="我要找房"
          desc="浏览附近房源，找到心仪的住所"
          variant="find"
          onClick={() => void Taro.switchTab({ url: '/pages/find/index' })}
        />
        <ActionCard
          icon="📋"
          label="我要分享"
          desc="发布你的房源信息，寻找合适的室友"
          variant="share"
          onClick={() => void Taro.navigateTo({ url: '/pages/share/index' })}
        />
      </View>

      <View className="home-tips">
        <Text className="home-tips__title">温馨提示</Text>
        <Text className="home-tips__text">真实信息，安全交流，共建友好社区</Text>
      </View>
    </PageShell>
  );
}
