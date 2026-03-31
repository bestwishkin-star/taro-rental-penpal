import type { PropsWithChildren } from 'react';

import { Text, View } from '@tarojs/components';

import './index.scss';

interface Props extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function FormSection({ title, subtitle, children }: Props) {
  return (
    <View className="form-section">
      <Text className="form-section__title">{title}</Text>
      {subtitle && <Text className="form-section__subtitle">{subtitle}</Text>}
      {children}
    </View>
  );
}
