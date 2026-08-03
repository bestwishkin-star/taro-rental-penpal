import { ScrollView, View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import './page-shell.scss';

interface PageShellProps extends PropsWithChildren {
  contentClassName?: string;
  scrollMode?: 'container' | 'native' | 'static';
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
  scrollMode,
  refresherEnabled,
  refresherTriggered,
  onRefresherRefresh,
  onScrollToLower,
  lowerThreshold = 100,
  scrollEnabled = true
}: PageShellProps) {
  const resolvedScrollMode = scrollMode ?? (scrollEnabled ? 'container' : 'static');
  const rootClasses = [
    'page-shell',
    resolvedScrollMode === 'native' ? 'page-shell--native' : '',
    resolvedScrollMode === 'static' ? 'page-shell--static' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const contentClasses = [
    'page-shell__content',
    resolvedScrollMode === 'static' ? 'page-shell__content--static' : '',
    contentClassName
  ]
    .filter(Boolean)
    .join(' ');

  if (resolvedScrollMode === 'native') {
    return (
      <View className={rootClasses}>
        <View className="page-shell__scroll page-shell__scroll--native">
          <View className={contentClasses}>{children}</View>
        </View>
      </View>
    );
  }

  if (resolvedScrollMode === 'static') {
    return (
      <View className={rootClasses}>
        <View className="page-shell__scroll page-shell__scroll--static">
          <View className={contentClasses}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View className={rootClasses}>
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
