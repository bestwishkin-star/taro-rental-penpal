import type { ListRentalsQuery, RentalListing } from '@shared/contracts/rental';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRentals } from '@/shared/api/services';
import EmptyState from '@/shared/ui/empty-state';
import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import type { FilterValue, PriceRange } from './components/FilterChips';
import { FilterChips } from './components/FilterChips';
import { RentalCard } from './components/RentalCard';
import { SearchBar } from './components/SearchBar';
import { SortBar } from './components/SortBar';
import type { SortValue } from './components/SortBar';

import './index.scss';

const PAGE_SIZE = 10;

export default function FindPage() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>(undefined);
  const [sort, setSort] = useState<SortValue>('default');
  const [rentals, setRentals] = useState<RentalListing[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // 防止并发请求
  const requestingRef = useRef(false);

  useDidShow(() => {
    setTabBarSelected(1);
  });

  // 搜索关键词 500ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (requestingRef.current) return;
      requestingRef.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const query: ListRentalsQuery = {
          keyword: debouncedKeyword || undefined,
          filter: filter === 'all' ? undefined : filter,
          sort: sort === 'default' ? undefined : sort,
          page: String(pageNum),
          pageSize: String(PAGE_SIZE),
          priceRange
        };
        const data = await fetchRentals(query);
        setRentals((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        void Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        requestingRef.current = false;
      }
    },
    [debouncedKeyword, filter, priceRange, sort]
  );

  // 搜索/筛选/排序变化时重置到第 1 页
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
    setFilter('all');
    setPriceRange(undefined);
    setSort('default');
  }

  return (
    <PageShell
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
      onScrollToLower={handleScrollToLower}
    >
      <View className="find-controls">
        <View className="find-controls__search">
          <SearchBar value={keyword} onChange={setKeyword} />
        </View>
        <FilterChips
          filter={filter}
          priceRange={priceRange}
          onFilterChange={setFilter}
          onPriceRangeChange={setPriceRange}
        />
      </View>

      <View className="find-sort">
        <SortBar active={sort} onChange={setSort} />
      </View>

      <View className="find-list">
        {loading && (
          <View className="find-empty">
            <Text className="find-empty__text">加载中...</Text>
          </View>
        )}
        {!loading && rentals.length === 0 && (
          <EmptyState onReset={handleReset} />
        )}
        {rentals.map((item) => (
          <View key={item.id} className="find-list__item">
            <RentalCard
              item={item}
              onClick={() => void Taro.navigateTo({ url: `/pages/rental-detail/index?id=${item.id}` })}
            />
          </View>
        ))}
        {loadingMore && (
          <View className="find-footer">
            <Text className="find-footer__text">加载更多...</Text>
          </View>
        )}
        {!loading && !loadingMore && !hasMore && rentals.length > 0 && (
          <View className="find-footer">
            <Text className="find-footer__text">已加载全部房源</Text>
          </View>
        )}
      </View>
    </PageShell>
  );
}
