import type { RentalListing } from '@shared/contracts/rental';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';

import iconFind from '@/assets/icons/home/icon-find.png';
import iconShare from '@/assets/icons/home/icon-share.png';
import { fetchTodayDailyTask } from '@/shared/api/daily-task';
import { fetchMyRentals } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { AppLayout } from '@/shared/ui/app-layout';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { ActionCard } from './components/ActionCard';
import {
  DailyObservationEntry,
  type DailyObservationEntryState
} from './components/DailyObservationEntry';
import { HeroCarousel } from './components/HeroCarousel';

import './index.scss';

/** 首页：提供浏览屋檐故事和记录居住体验的核心入口。 */
export default function HomePage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const requestSequenceRef = useRef(0);
  const authEffectReadyRef = useRef(false);
  const [dailyObservation, setDailyObservation] = useState<DailyObservationEntryState>({
    status: isLoggedIn ? 'LOADING' : 'LOGGED_OUT'
  });

  /** 根据当前真实登录状态刷新首页今日观察，序号用于丢弃过期请求响应。 */
  const loadDailyObservation = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    if (!useAuthStore.getState().isLoggedIn) {
      setDailyObservation({ status: 'LOGGED_OUT' });
      return;
    }

    setDailyObservation({ status: 'LOADING' });
    try {
      const rentals = await fetchMyRentals();
      type RentalWithUpdatedAt = RentalListing & { updatedAt?: string };
      const publishedRentals = (rentals as RentalWithUpdatedAt[]).filter(
        (rental) => rental.status === 'active' && (!rental.postStatus || rental.postStatus === 'active')
      );
      const latestRental = publishedRentals.sort((left, right) => {
        const leftUpdatedAt = left.updatedAt ?? left.createdAt ?? '';
        const rightUpdatedAt = right.updatedAt ?? right.createdAt ?? '';
        return Date.parse(rightUpdatedAt) - Date.parse(leftUpdatedAt);
      })[0];

      if (requestSequence !== requestSequenceRef.current) return;
      if (!latestRental) {
        setDailyObservation({ status: 'NO_RENTAL' });
        return;
      }

      const dailyTask = await fetchTodayDailyTask(latestRental.id);
      if (requestSequence !== requestSequenceRef.current) return;
      if (!dailyTask.completedToday && !dailyTask.task) {
        setDailyObservation({ status: 'ERROR' });
        return;
      }
      setDailyObservation({ status: 'READY', rentalId: latestRental.id, dailyTask });
    } catch {
      if (requestSequence !== requestSequenceRef.current) return;
      setDailyObservation({ status: 'ERROR' });
    }
  }, []);

  useDidShow(() => {
    setTabBarSelected(0);
    void loadDailyObservation();
  });

  useEffect(() => {
    // 首次展示由 useDidShow 加载；后续登录或退出登录时立即同步入口状态。
    if (!authEffectReadyRef.current) {
      authEffectReadyRef.current = true;
      return;
    }
    void loadDailyObservation();
  }, [isLoggedIn, loadDailyObservation]);

  return (
    <AppLayout mode="list" withTabBar>
      <HeroCarousel />

      <DailyObservationEntry
        state={dailyObservation}
        onRetry={() => void loadDailyObservation()}
      />

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
