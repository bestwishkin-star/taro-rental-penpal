import type { RentalListing } from '@shared/contracts/rental';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';

import { RentalCard } from '@/pages/find/components/RentalCard';
import { fetchFavorites, fetchMyRentals, getBrowseHistory } from '@/shared/api/services';

import './index.scss';

type ListType = 'mine' | 'favorites' | 'history';

const TITLES: Record<ListType, string> = {
  mine: '我的发布',
  favorites: '我的收藏',
  history: '浏览历史'
};

const EMPTY_TEXTS: Record<ListType, string> = {
  mine: '还没有发布过房源',
  favorites: '还没有收藏过房源',
  history: '还没有浏览记录'
};

export default function RentalListPage() {
  const [rentals, setRentals] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const typeRef = useRef<ListType>('mine');

  useDidShow(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const type = (params.type as ListType) || 'mine';
    typeRef.current = type;
    void Taro.setNavigationBarTitle({ title: TITLES[type] });
  });

  useEffect(() => {
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

  return (
    <View className="rental-list-page">
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
      {rentals.map((item) => (
        <View key={item.id} className="rental-list-page__item">
          <RentalCard
            item={item}
            onClick={() => void Taro.navigateTo({ url: `/pages/rental-detail/index?id=${item.id}` })}
          />
        </View>
      ))}
    </View>
  );
}
