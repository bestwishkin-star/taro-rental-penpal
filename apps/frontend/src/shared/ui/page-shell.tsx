import type { PropsWithChildren } from 'react';

import { View } from '@tarojs/components';

import './page-shell.scss';

interface PageShellProps extends PropsWithChildren {
  currentRoute?: string;
  withBottomNav?: boolean;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <View className="page-shell">
      <View className="page-shell__content">{children}</View>
    </View>
  );
}
