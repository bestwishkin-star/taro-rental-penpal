import { Text, View } from '@tarojs/components';

import './index.scss';

interface Props {
  icon: string;
  iconVariant?: string;
  label: string;
  desc: string;
  onClick?: () => void;
}

export function ProfileMenuItem({ icon, iconVariant, label, desc, onClick }: Props) {
  return (
    <View className="profile-menu-item" hoverClass="profile-menu-item--active" onClick={onClick}>
      <View className={`profile-menu-item__icon${iconVariant ? ` profile-menu-item__icon--${iconVariant}` : ''}`}>
        <Text className="profile-menu-item__icon-text">{icon}</Text>
      </View>
      <View className="profile-menu-item__body">
        <Text className="profile-menu-item__label">{label}</Text>
        <Text className="profile-menu-item__desc">{desc}</Text>
      </View>
      <Text className="profile-menu-item__arrow">›</Text>
    </View>
  );
}
