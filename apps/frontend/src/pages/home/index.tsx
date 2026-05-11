import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import iconFind from '@/assets/icons/home/icon-find.png';
import iconShare from '@/assets/icons/home/icon-share.png';
import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { ActionCard } from './components/ActionCard';
import { HeroCarousel } from './components/HeroCarousel';

import './index.scss';

/** 首页：提供浏览屋檐故事和记录居住体验的核心入口。 */
export default function HomePage() {
  useDidShow(() => {
    setTabBarSelected(0);
  });

  return (
    <PageShell>
      <HeroCarousel />

      <View className="home-actions">
        <ActionCard
          icon={iconFind}
          label="翻看屋檐故事"
          desc="看看其他人的真实体验、避坑提醒和费用参考"
          onClick={() => void Taro.switchTab({ url: '/pages/find/index' })}
        />
        <ActionCard
          icon={iconShare}
          label="写下一方屋檐下"
          desc="把你的居住冷暖写成一篇屋檐记"
          onClick={() => void Taro.navigateTo({ url: '/pages/share/index' })}
        />
      </View>

      <View className="home-tips">
        <Text className="home-tips__title">屋檐记发布提示</Text>
        <Text className="home-tips__text">落笔前请隐藏手机号、门牌号、合同号等隐私信息，凭证仅供平台复核。</Text>
      </View>
    </PageShell>
  );
}
