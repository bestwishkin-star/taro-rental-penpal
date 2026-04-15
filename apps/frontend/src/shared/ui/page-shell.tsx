import { ScrollView, View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import './page-shell.scss';

interface PageShellProps extends PropsWithChildren {
  contentClassName?: string;
  refresherEnabled?: boolean;
  refresherTriggered?: boolean;
  onRefresherRefresh?: () => void;
  onScrollToLower?: () => void;
  lowerThreshold?: number;
  scrollEnabled?: boolean;
}

export function PageShell({
  children,
  contentClassName,
  refresherEnabled,
  refresherTriggered,
  onRefresherRefresh,
  onScrollToLower,
  lowerThreshold = 100,
  scrollEnabled = true
}: PageShellProps) {
  const contentClasses = ['page-shell__content', !scrollEnabled ? 'page-shell__content--static' : '', contentClassName]
    .filter(Boolean)
    .join(' ');

  if (!scrollEnabled) {
    return (
      <View className="page-shell">
        <View className="page-shell__scroll page-shell__scroll--static">
          <View className={contentClasses}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View className="page-shell">
      <ScrollView
        scrollY
        showScrollbar={false}
        className="page-shell__scroll"
        refresherEnabled={refresherEnabled}
        refresherTriggered={refresherTriggered}
        onRefresherRefresh={onRefresherRefresh}
        onScrollToLower={onScrollToLower}
        lowerThreshold={lowerThreshold}
      >
        <View className={contentClasses}>{children}</View>
      </ScrollView>
    </View>
  );
}
