import { Image, Text, View } from '@tarojs/components';

import iconChevronRight from '@/assets/icons/common/icon-chevron-right.png';

import './index.scss';

interface Props {
  icon: string;
  label: string;
  desc: string;
  onClick: () => void;
}

export function ActionCard({ icon, label, desc, onClick }: Props) {
  return (
    <View
      className="action-card"
      hoverClass="action-card--active"
      onClick={onClick}
    >
      <Image src={icon} className="action-card__icon" mode="aspectFit" />
      <View className="action-card__body">
        <Text className="action-card__label">{label}</Text>
        <Text className="action-card__desc">{desc}</Text>
      </View>
      <Image src={iconChevronRight} className="action-card__arrow" mode="aspectFit" />
    </View>
  );
}
