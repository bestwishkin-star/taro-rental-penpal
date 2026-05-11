import type { RentalRegionInput } from '@shared/contracts/location';
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
import { RegionFilter } from './components/RegionFilter';
import { RentalCard } from './components/RentalCard';
import { SearchBar } from './components/SearchBar';
import { SortBar } from './components/SortBar';
import type { SortValue } from './components/SortBar';

import './index.scss';

const PAGE_SIZE = 10;

/** 发现页，展示社区里的屋檐故事内容流。 */
export default function FindPage() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [priceRange, setPriceRange] = useState<PriceRange>(undefined);
  const [region, setRegion] = useState<RentalRegionInput | null>(null);
  const [sort, setSort] = useState<SortValue>('default');
  const [rentals, setRentals] = useState<RentalListing[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const requestingRef = useRef(false);

  useDidShow(() => {
    setTabBarSelected(1);
  });

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
          priceRange,
          province: region?.province,
          city: region?.city,
          district: region?.district
        };
        const data = await fetchRentals(query);
        setRentals((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        void Taro.showToast({ title: '加载屋檐故事失败，请稍后再试', icon: 'none' });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        requestingRef.current = false;
      }
    },
    [debouncedKeyword, filter, priceRange, region, sort]
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
    setFilter('all');
    setPriceRange(undefined);
    setRegion(null);
    setSort('default');
    setShowFilters(false);
  }

  const hasActiveFilters = filter !== 'all' || Boolean(priceRange) || Boolean(region) || sort !== 'default';

  return (
    <PageShell
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
      onScrollToLower={handleScrollToLower}
    >
      <View className="find-header">
        <View className="find-header__copy">
          <Text className="find-header__title">一方屋檐下</Text>
          <Text className="find-header__subtitle">翻看城市里的居住冷暖</Text>
        </View>
        <View
          className={`find-header__filter-btn${showFilters ? ' find-header__filter-btn--open' : ''}${
            hasActiveFilters ? ' find-header__filter-btn--active' : ''
          }`}
          onClick={() => setShowFilters((value) => !value)}
        >
          <Text className="find-header__filter-text">筛选</Text>
          {hasActiveFilters && <View className="find-header__filter-dot" />}
        </View>
      </View>

      <View className="find-search">
        <SearchBar value={keyword} onChange={setKeyword} />
      </View>

      {showFilters && (
        <View className="find-filter-panel">
          <FilterChips
            filter={filter}
            priceRange={priceRange}
            onFilterChange={setFilter}
            onPriceRangeChange={setPriceRange}
          />
          <View className="find-filter-panel__section">
            <Text className="find-filter-panel__label">区域</Text>
            <RegionFilter value={region} onChange={setRegion} />
          </View>
          <View className="find-filter-panel__section">
            <Text className="find-filter-panel__label">排序</Text>
            <SortBar active={sort} onChange={setSort} />
          </View>
          {hasActiveFilters && (
            <View className="find-filter-panel__reset" onClick={handleReset}>
              <Text className="find-filter-panel__reset-text">重置筛选</Text>
            </View>
          )}
        </View>
      )}

      <View className="find-list">
        {loading && (
          <View className="find-empty">
            <Text className="find-empty__text">正在翻找屋檐故事...</Text>
          </View>
        )}
        {!loading && rentals.length === 0 && <EmptyState onReset={handleReset} />}
        {rentals.map((item) => (
          <View key={item.id} className="find-list__item">
            <RentalCard item={item} onClick={() => void Taro.navigateTo({ url: `/pages/rental-detail/index?id=${item.id}` })} />
          </View>
        ))}
        {loadingMore && (
          <View className="find-footer">
            <Text className="find-footer__text">继续翻找屋檐故事...</Text>
          </View>
        )}
        {!loading && !loadingMore && !hasMore && rentals.length > 0 && (
          <View className="find-footer">
            <Text className="find-footer__text">这些屋檐故事先看到这里</Text>
          </View>
        )}
      </View>
    </PageShell>
  );
}
