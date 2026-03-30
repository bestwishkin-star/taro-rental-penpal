import { Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';

import { setTabBarSelected } from '@/shared/utils/tab-bar';
import { PageShell } from '@/shared/ui/page-shell';

import './index.scss';

export default function FindPage() {
  useDidShow(() => {
    setTabBarSelected(1);
  });

  return (
    <PageShell>
      <View className="find-hero">
        <Text className="find-hero__title">找房</Text>
        <Text className="find-hero__subtitle">浏览附近的房源信息</Text>
      </View>

      <View className="find-content">
        <Text className="find-placeholder">房源列表开发中...</Text>
      </View>
    </PageShell>
  );
}
