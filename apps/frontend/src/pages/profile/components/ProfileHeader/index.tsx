import { Image, Text, View } from '@tarojs/components';

import './index.scss';

interface StatItem {
  value: number | string;
  label: string;
}

interface Props {
  nickname?: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
  stats: StatItem[];
  onClick?: () => void;
}

export function ProfileHeader({ nickname, avatarUrl, isLoggedIn, stats, onClick }: Props) {
  return (
    <View className="profile-header" hoverClass="profile-header--active" onClick={onClick}>
      <View className="profile-header__top">
        {avatarUrl ? (
          <Image src={avatarUrl} className="profile-header__avatar" mode="aspectFill" />
        ) : (
          <View className="profile-header__avatar" />
        )}
        <View className="profile-header__info">
          <Text className="profile-header__name">
            {isLoggedIn ? (nickname || '未设置昵称') : '立即登录'}
          </Text>
          <Text className="profile-header__desc">
            {isLoggedIn ? '编辑资料，完善你的租房偏好' : '登录后查看我的发布、收藏和浏览历史'}
          </Text>
        </View>
      </View>
      <View className="profile-header__stats">
        {stats.map((stat) => (
          <View key={stat.label} className="profile-header__stat">
            <Text className="profile-header__stat-value">{stat.value}</Text>
            <Text className="profile-header__stat-label">{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
