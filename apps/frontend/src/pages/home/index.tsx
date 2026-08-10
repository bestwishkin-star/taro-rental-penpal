import type { DailyTaskTodayResponse } from '@shared/contracts/daily-task';
import type { RentalListing } from '@shared/contracts/rental';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import iconFind from '@/assets/icons/home/icon-find.png';
import iconShare from '@/assets/icons/home/icon-share.png';
import { fetchTodayDailyTask } from '@/shared/api/daily-task';
import { fetchMyRentals } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { AppLayout } from '@/shared/ui/app-layout';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { ActionCard } from './components/ActionCard';
import { DailyObservationEntry } from './components/DailyObservationEntry';
import { HeroCarousel } from './components/HeroCarousel';

import './index.scss';

/** 首页：提供浏览屋檐故事和记录居住体验的核心入口。 */
export default function HomePage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [dailyObservation, setDailyObservation] = useState<{
    rentalId: string;
    dailyTask: DailyTaskTodayResponse;
  } | null>(null);

  useDidShow(() => {
    setTabBarSelected(0);

    if (!isLoggedIn) {
      setDailyObservation(null);
      return;
    }

    void fetchMyRentals()
      .then(async (rentals) => {
        type RentalWithUpdatedAt = RentalListing & { updatedAt?: string };
        const publishedRentals = (rentals as RentalWithUpdatedAt[]).filter(
          (rental) => rental.status === 'active' && (!rental.postStatus || rental.postStatus === 'active')
        );
        const latestRental = publishedRentals.sort((left, right) => {
          const leftUpdatedAt = left.updatedAt ?? left.createdAt ?? '';
          const rightUpdatedAt = right.updatedAt ?? right.createdAt ?? '';
          return Date.parse(rightUpdatedAt) - Date.parse(leftUpdatedAt);
        })[0];

        if (!latestRental) {
          setDailyObservation(null);
          return;
        }

        const dailyTask = await fetchTodayDailyTask(latestRental.id);
        setDailyObservation({ rentalId: latestRental.id, dailyTask });
      })
      .catch(() => setDailyObservation(null));
  });

  return (
    <AppLayout mode="list" withTabBar>
      <HeroCarousel />

      {dailyObservation && (
        <DailyObservationEntry
          rentalId={dailyObservation.rentalId}
          dailyTask={dailyObservation.dailyTask}
        />
      )}

      <View className="home-actions">
        <ActionCard
          icon={iconFind}
          label="翻看屋檐故事"
          desc="看看其他人的真实体验、生活细节和避坑提醒"
          onClick={() => void Taro.switchTab({ url: '/pages/find/index' })}
        />
        <ActionCard
          icon={iconShare}
          label="写下一方屋檐下"
          desc="把你的居住冷暖写成一篇屋檐记"
          onClick={() => void Taro.navigateTo({ url: '/pages/share/index' })}
        />
      </View>

      <View className="home-tips">
        <Text className="home-tips__title">屋檐记发布提示</Text>
        <Text className="home-tips__text">落笔前请隐藏手机号、门牌号、合同号等隐私信息，凭证仅供平台复核。</Text>
      </View>
    </AppLayout>
  );
}
