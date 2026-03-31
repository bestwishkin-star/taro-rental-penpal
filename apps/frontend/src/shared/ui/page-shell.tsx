import { ScrollView, View } from '@tarojs/components';

import type { PropsWithChildren } from 'react';

import './page-shell.scss';

interface PageShellProps extends PropsWithChildren {
  currentRoute?: string;
  withBottomNav?: boolean;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <View className="page-shell">
      <ScrollView scrollY showScrollbar={false} className="page-shell__scroll">
        <View className="page-shell__content">{children}</View>
      </ScrollView>
    </View>
  );
}
