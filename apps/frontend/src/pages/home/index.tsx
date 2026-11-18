import type { HouseRecordListing } from '@shared/contracts/house-record';
import type { RentalListing } from '@shared/contracts/rental';
import { View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchTodayDailyTask } from '@/shared/api/daily-task';
import {
  fetchHouseRecords,
  fetchHouseRecordSnapshot,
  fetchHouseRecordTimeline
} from '@/shared/api/house-record';
import { fetchMyRentals } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { AppLayout } from '@/shared/ui/app-layout';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import {
  DailyObservationEntry,
  type DailyObservationEntryState
} from './components/DailyObservationEntry';
import { HomeGreeting } from './components/HomeGreeting';
import { PrivacyNote } from './components/PrivacyNote';
import { QuickMoves } from './components/QuickMoves';
import { RoofStories, type RoofStoryItem } from './components/RoofStories';

import './index.scss';

/** 将任意长度的公开正文压缩成适合图片叠字的一行短标题。 */
function buildStoryTitle(text: string | undefined, fallback: string): string {
  const normalized = (text || fallback).replace(/\s+/g, ' ').trim();
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

/** 首页：提供浏览屋檐故事和记录居住体验的核心入口。 */
export default function HomePage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const navigationInset = (Taro.getSystemInfoSync().statusBarHeight ?? 20) + 44;
  const requestSequenceRef = useRef(0);
  const authEffectReadyRef = useRef(false);
  const [dailyObservation, setDailyObservation] = useState<DailyObservationEntryState>({
    status: isLoggedIn ? 'LOADING' : 'LOGGED_OUT'
  });
  const [roofStories, setRoofStories] = useState<RoofStoryItem[]>([]);
  const [roofStoriesLoading, setRoofStoriesLoading] = useState(true);

  /** 将发现列表房屋与最新成长节点组合为可直达点位的首页片段。 */
  const loadRoofStories = useCallback(async () => {
    setRoofStoriesLoading(true);
    try {
      const listings = await fetchHouseRecords({ page: 1, pageSize: 4 });
      const candidates = await Promise.all(
        listings.map(async (listing: HouseRecordListing): Promise<RoofStoryItem | null> => {
          try {
            const timeline = await fetchHouseRecordTimeline(listing.rentalId);
            const latestNode =
              timeline.nodes.find((node) => node.isLatest) ??
              timeline.nodes.find((node) => node.snapshotDate === listing.latestSnapshotDate) ??
              timeline.nodes[0];
            const module = latestNode?.updatedModules[0];
            if (!latestNode || !module) return null;
            const snapshot = await fetchHouseRecordSnapshot(listing.rentalId, latestNode.snapshotDate);
            const pointRecord = snapshot.records.find((record) => record.module === module);
            const pointSummary =
              pointRecord?.eventText ||
              pointRecord?.observations[0]?.value ||
              latestNode.contentPreview ||
              listing.contentPreview;
            return {
              rentalId: listing.rentalId,
              snapshotDate: latestNode.snapshotDate,
              module,
              title: buildStoryTitle(pointSummary, `${listing.title}的最新记录`),
              author: listing.author.nickname,
              coverPhoto: pointRecord?.publicPhotos[0] || latestNode.coverPhoto || listing.coverPhoto
            };
          } catch {
            return null;
          }
        })
      );
      setRoofStories(candidates.filter((item): item is RoofStoryItem => Boolean(item)).slice(0, 2));
    } catch {
      setRoofStories([]);
    } finally {
      setRoofStoriesLoading(false);
    }
  }, []);

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
    void loadRoofStories();
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
    <AppLayout mode="list" withTabBar contentClassName="home-page">
      <HomeGreeting date={new Date()} topInset={navigationInset} />
      <View className="home-page__content">
        <DailyObservationEntry
          state={dailyObservation}
          onRetry={() => void loadDailyObservation()}
        />
        <RoofStories items={roofStories} loading={roofStoriesLoading} />
        <QuickMoves />
        <PrivacyNote />
      </View>
    </AppLayout>
  );
}
