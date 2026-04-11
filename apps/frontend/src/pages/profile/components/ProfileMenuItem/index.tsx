import { Image, Text, View } from '@tarojs/components';

import iconChevronRight from '@/assets/icons/common/icon-chevron-right.png';

import './index.scss';

interface Props {
  icon: string;
  label: string;
  desc: string;
  onClick?: () => void;
}

export function ProfileMenuItem({ icon, label, desc, onClick }: Props) {
  return (
    <View className="profile-menu-item" hoverClass="profile-menu-item--active" onClick={onClick}>
      <Image src={icon} className="profile-menu-item__icon" mode="aspectFit" />
      <View className="profile-menu-item__body">
        <Text className="profile-menu-item__label">{label}</Text>
        <Text className="profile-menu-item__desc">{desc}</Text>
      </View>
      <Image src={iconChevronRight} className="profile-menu-item__arrow" mode="aspectFit" />
    </View>
  );
}
