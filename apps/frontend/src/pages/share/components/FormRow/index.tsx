import { Image, Text, View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import iconChevronRight from '@/assets/icons/common/icon-chevron-right.png';

import './index.scss';

interface Props extends PropsWithChildren {
  icon: string;
  label: string;
  arrow?: boolean;
}

export function FormRow({ icon, label, arrow = false, children }: Props) {
  return (
    <View className="form-row">
      <Image src={icon} className="form-row__icon" mode="aspectFit" />
      <Text className="form-row__label">{label}</Text>
      <View className="form-row__content">{children}</View>
      {arrow && <Image src={iconChevronRight} className="form-row__arrow" mode="aspectFit" />}
    </View>
  );
}

export function FormRowDivider() {
  return <View className="form-row__divider" />;
}
