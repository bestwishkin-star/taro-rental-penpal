import { ScrollView, View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import { buildAppLayoutClasses, type AppLayoutMode } from './class-names';

/** 全局页面 Layout 参数。 */
export interface AppLayoutProps extends PropsWithChildren {
  mode?: AppLayoutMode;
  contentClassName?: string;
  withTabBar?: boolean;
  safeAreaBottom?: boolean;
  refresherEnabled?: boolean;
  refresherTriggered?: boolean;
  onRefresherRefresh?: () => void;
  onScrollToLower?: () => void;
  lowerThreshold?: number;
}

/** 统一维护小程序页面的可视区域、滚动容器和底部安全区。 */
export function AppLayout({
  children,
  mode = 'native',
  contentClassName,
  withTabBar = false,
  safeAreaBottom = true,
  refresherEnabled,
  refresherTriggered,
  onRefresherRefresh,
  onScrollToLower,
  lowerThreshold = 100
}: AppLayoutProps) {
  const classes = buildAppLayoutClasses({ mode, contentClassName, withTabBar, safeAreaBottom });
  const content = <View className={classes.content}>{children}</View>;

  if (mode !== 'list') {
    return (
      <View className={classes.root}>
        <View className={classes.scroll}>{content}</View>
      </View>
    );
  }

  return (
    <View className={classes.root}>
      <ScrollView
        scrollY
        showScrollbar={false}
        className={classes.scroll}
        refresherEnabled={Boolean(refresherEnabled && onRefresherRefresh)}
        refresherTriggered={refresherTriggered}
        onRefresherRefresh={onRefresherRefresh}
        onScrollToLower={onScrollToLower}
        lowerThreshold={lowerThreshold}
      >
        {content}
      </ScrollView>
    </View>
  );
}
