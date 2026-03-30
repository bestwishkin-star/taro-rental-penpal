import { Text, View } from '@tarojs/components';

import { PageShell } from '@/shared/ui/page-shell';

import './index.scss';

export default function SharePage() {
  return (
    <PageShell>
      <View className="share-hero">
        <Text className="share-hero__title">分享房源</Text>
        <Text className="share-hero__subtitle">发布你的房源，寻找合适的室友</Text>
      </View>

      <View className="share-content">
        <Text className="share-placeholder">发布表单开发中...</Text>
      </View>
    </PageShell>
  );
}
