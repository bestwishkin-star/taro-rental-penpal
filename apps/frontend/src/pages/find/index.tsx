import type { HouseRecordListing } from '@shared/contracts/house-record';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchHouseRecords } from '@/shared/api/house-record';
import { AppLayout } from '@/shared/ui/app-layout';
import EmptyState from '@/shared/ui/empty-state';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { HouseRecordCard } from './components/HouseRecordCard';
import { SearchBar } from './components/SearchBar';

import './index.scss';

/** 发现页固定分页大小。 */
const PAGE_SIZE = 10;

/** 发现页，展示社区成员持续更新的房屋实录。 */
export default function FindPage() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [records, setRecords] = useState<HouseRecordListing[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestingRef = useRef(false);

  useDidShow(() => {
    setTabBarSelected(1);
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  /** 加载一页实录，并根据 append 决定替换或追加。 */
  const loadPage = useCallback(
    async (pageNumber: number, append: boolean) => {
      if (requestingRef.current) return;
      requestingRef.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const data = await fetchHouseRecords({
          keyword: debouncedKeyword || undefined,
          page: pageNumber,
          pageSize: PAGE_SIZE
        });
        setRecords((previous) => (append ? [...previous, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNumber);
      } catch {
        void Taro.showToast({ title: '房屋实录暂时走丢了，请稍后再试', icon: 'none' });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        requestingRef.current = false;
      }
    },
    [debouncedKeyword]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void loadPage(1, false);
  }, [loadPage]);

  function handleRefresh() {
    setRefreshing(true);
    void loadPage(1, false);
  }

  function handleScrollToLower() {
    if (!hasMore || loadingMore || loading) return;
    void loadPage(page + 1, true);
  }

  function handleReset() {
    setKeyword('');
  }

  /** 打开某套房屋最近一个月的成长记录。 */
  function openTimeline(rentalId: string) {
    void Taro.navigateTo({
      url: `/pages/house-record/timeline/index?rentalId=${rentalId}`
    });
  }

  return (
    <AppLayout
      mode="list"
      withTabBar
      contentClassName="find-page"
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
      onScrollToLower={handleScrollToLower}
    >
      <View className="find-header">
        <Text className="find-header__title">房屋实录</Text>
        <Text className="find-header__subtitle">循着生活留下的痕迹，看见屋檐真正的模样</Text>
      </View>

      <View className="find-search">
        <SearchBar value={keyword} onChange={setKeyword} />
      </View>

      <View className="find-list">
        {loading && (
          <View className="find-empty">
            <Text className="find-empty__text">正在翻看最近的生活切片...</Text>
          </View>
        )}
        {!loading && records.length === 0 && <EmptyState onReset={handleReset} />}
        {records.map((item) => (
          <View key={item.rentalId} className="find-list__item">
            <HouseRecordCard item={item} onClick={() => openTimeline(item.rentalId)} />
          </View>
        ))}
        {loadingMore && (
          <View className="find-footer">
            <Text className="find-footer__text">继续翻看更多房屋实录...</Text>
          </View>
        )}
        {!loading && !loadingMore && !hasMore && records.length > 0 && (
          <View className="find-footer">
            <Text className="find-footer__text">这个月的生活痕迹先看到这里</Text>
          </View>
        )}
      </View>
    </AppLayout>
  );
}
