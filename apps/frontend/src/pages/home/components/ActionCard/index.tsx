import { Text, View } from '@tarojs/components';

import './index.scss';

interface Props {
  icon: string;
  label: string;
  desc: string;
  variant?: 'find' | 'share';
  onClick: () => void;
}

export function ActionCard({ icon, label, desc, variant = 'find', onClick }: Props) {
  return (
    <View
      className="action-card"
      hoverClass="action-card--active"
      onClick={onClick}
    >
      <View className={`action-card__icon-wrap action-card__icon-wrap--${variant}`}>
        <Text className="action-card__icon">{icon}</Text>
      </View>
      <View className="action-card__body">
        <Text className="action-card__label">{label}</Text>
        <Text className="action-card__desc">{desc}</Text>
      </View>
      <Text className="action-card__arrow">›</Text>
    </View>
  );
}
