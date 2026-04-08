import { ScrollView, View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import './page-shell.scss';

interface PageShellProps extends PropsWithChildren {
  refresherEnabled?: boolean;
  refresherTriggered?: boolean;
  onRefresherRefresh?: () => void;
  onScrollToLower?: () => void;
  lowerThreshold?: number;
}

export function PageShell({
  children,
  refresherEnabled,
  refresherTriggered,
  onRefresherRefresh,
  onScrollToLower,
  lowerThreshold = 100
}: PageShellProps) {
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
        <View className="page-shell__content">{children}</View>
      </ScrollView>
    </View>
  );
}
