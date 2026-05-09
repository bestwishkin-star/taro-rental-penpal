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

// 列表分页大小：同时用于请求 pageSize 和判断是否还有下一页。
const PAGE_SIZE = 10;

/** 找房页：聚合搜索、筛选、地区、排序和分页加载逻辑。 */
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
  const requestingRef = useRef(false);

  useDidShow(() => {
    // 每次显示找房页时同步底部 TabBar 选中态。
    setTabBarSelected(1);
  });

  useEffect(() => {
    // 搜索词防抖，减少用户输入过程中的重复请求。
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  /** 按当前筛选条件加载指定页；append=true 时追加到现有列表。 */
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
        void Taro.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
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
    // 任一筛选条件变化后回到第一页重新拉取。
    setPage(1);
    setHasMore(true);
    void loadPage(1, false);
  }, [loadPage]);

  /** 下拉刷新：保持当前筛选条件并重新加载第一页。 */
  function handleRefresh() {
    setRefreshing(true);
    void loadPage(1, false);
  }

  /** 滚动到底部：在未加载完时请求下一页。 */
  function handleScrollToLower() {
    if (!hasMore || loadingMore || loading) return;
    void loadPage(page + 1, true);
  }

  /** 清空所有筛选条件，回到默认列表状态。 */
  function handleReset() {
    setKeyword('');
    setFilter('all');
    setPriceRange(undefined);
    setRegion(null);
    setSort('default');
  }

  return (
    <PageShell
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
      onScrollToLower={handleScrollToLower}
    >
      {/* 搜索与筛选区：关键词、房型价格、地区三级联动。 */}
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
        <RegionFilter value={region} onChange={setRegion} />
      </View>

      {/* 排序区：控制默认、价格、时间等列表排序方式。 */}
      <View className="find-sort">
        <SortBar active={sort} onChange={setSort} />
      </View>

      {/* 房源列表区：包含加载态、空态、卡片列表和分页尾部。 */}
      <View className="find-list">
        {loading && (
          <View className="find-empty">
            <Text className="find-empty__text">加载中...</Text>
          </View>
        )}
        {!loading && rentals.length === 0 && <EmptyState onReset={handleReset} />}
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
            <Text className="find-footer__text">继续加载...</Text>
          </View>
        )}
        {!loading && !loadingMore && !hasMore && rentals.length > 0 && (
          <View className="find-footer">
            <Text className="find-footer__text">没有更多房源了</Text>
          </View>
        )}
      </View>
    </PageShell>
  );
}
