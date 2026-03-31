import { Text, View } from '@tarojs/components';

import './index.scss';

interface StatItem {
  value: number | string;
  label: string;
}

interface Props {
  nickname?: string;
  isLoggedIn: boolean;
  stats?: StatItem[];
  onClick?: () => void;
}

const DEFAULT_STATS: StatItem[] = [
  { value: 0, label: '发布' },
  { value: 0, label: '收藏' },
  { value: 0, label: '浏览' }
];

export function ProfileHeader({ nickname, isLoggedIn, stats = DEFAULT_STATS, onClick }: Props) {
  return (
    <View className="profile-header" hoverClass="profile-header--active" onClick={onClick}>
      <View className="profile-header__top">
        <View className="profile-header__avatar" />
        <View className="profile-header__info">
          <Text className="profile-header__name">
            {isLoggedIn ? (nickname ?? '租房用户') : '未登录'}
          </Text>
          <Text className="profile-header__desc">
            {isLoggedIn ? '完善个人信息，提升信任度' : '点击登录查看更多功能'}
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
