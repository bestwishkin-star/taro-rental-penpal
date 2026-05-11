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

/** 个人中心头部，展示用户信息和社区互动统计。 */
export function ProfileHeader({ nickname, avatarUrl, isLoggedIn, stats, onClick }: Props) {
  return (
    <View className="profile-header" hoverClass="profile-header--active" onClick={onClick}>
      <View className="profile-header__top">
        {avatarUrl ? <Image src={avatarUrl} className="profile-header__avatar" mode="aspectFill" /> : <View className="profile-header__avatar" />}
        <View className="profile-header__info">
          <Text className="profile-header__name">{isLoggedIn ? nickname || '用户' : '点击登录'}</Text>
          <Text className="profile-header__desc">
            {isLoggedIn ? '管理你的屋檐记、收藏和浏览记录' : '登录后可以写下屋檐记、收藏内容和参与评论'}
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
