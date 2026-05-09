import type { RentalListing, RentalStatus } from '@shared/contracts/rental';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';

import { RentalCard } from '@/pages/find/components/RentalCard';
import { fetchFavorites, fetchMyRentals, getBrowseHistory, updateRentalStatus } from '@/shared/api/services';

import './index.scss';

type ListType = 'mine' | 'favorites' | 'history';

// 页面标题映射：根据路由 type 设置导航栏标题。
const TITLES: Record<ListType, string> = {
  mine: '我的发布',
  favorites: '我的收藏',
  history: '浏览历史'
};

// 空态文案映射：不同列表类型展示不同的无数据提示。
const EMPTY_TEXTS: Record<ListType, string> = {
  mine: '还没有发布过房源',
  favorites: '还没有收藏过房源',
  history: '还没有浏览记录'
};

/** 房源列表页：复用房源卡片展示我的发布、收藏和浏览历史。 */
export default function RentalListPage() {
  const [rentals, setRentals] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const typeRef = useRef<ListType>('mine');

  useDidShow(() => {
    // 页面显示时读取路由 type，并同步导航栏标题。
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const type = (params.type as ListType) || 'mine';
    typeRef.current = type;
    void Taro.setNavigationBarTitle({ title: TITLES[type] });
  });

  useEffect(() => {
    // 首次进入时按 type 选择本地历史或远端接口数据源。
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const type = (params.type as ListType) || 'mine';
    typeRef.current = type;

    if (type === 'history') {
      setRentals(getBrowseHistory());
      setLoading(false);
      return;
    }

    const fetcher = type === 'favorites' ? fetchFavorites : fetchMyRentals;
    fetcher()
      .then(setRentals)
      .catch(() => void Taro.showToast({ title: '加载失败', icon: 'none' }))
      .finally(() => setLoading(false));
  }, []);

  /** 切换我的发布状态，在列表内乐观更新对应卡片状态。 */
  async function handleToggleStatus(id: string, currentStatus: RentalStatus) {
    const nextStatus: RentalStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateRentalStatus(id, nextStatus);
      setRentals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );
    } catch {
      void Taro.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  }

  const isMine = typeRef.current === 'mine';

  return (
    <View className="rental-list-page">
      {/* 加载态与空态：避免列表请求期间页面空白。 */}
      {loading && (
        <View className="rental-list-page__empty">
          <Text className="rental-list-page__empty-text">加载中...</Text>
        </View>
      )}
      {!loading && rentals.length === 0 && (
        <View className="rental-list-page__empty">
          <Text className="rental-list-page__empty-text">{EMPTY_TEXTS[typeRef.current]}</Text>
        </View>
      )}
      {/* 房源卡片区：我的发布额外展示上下架操作。 */}
      {rentals.map((item) => (
        <View key={item.id} className="rental-list-page__item">
          <View className="rental-list-page__card-wrap">
            {item.status === 'inactive' && (
              <View className="rental-list-page__badge">
                <Text className="rental-list-page__badge-text">已下架</Text>
              </View>
            )}
            <RentalCard
              item={item}
              onClick={() => void Taro.navigateTo({ url: `/pages/rental-detail/index?id=${item.id}` })}
            />
            {isMine && (
              <View
                className="rental-list-page__status-btn"
                onClick={() => void handleToggleStatus(item.id, item.status)}
              >
                <Text className="rental-list-page__status-btn-text">
                  {item.status === 'active' ? '下架' : '重新上架'}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
