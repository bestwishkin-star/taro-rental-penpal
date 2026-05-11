import type { RentalDetail, RentalStayStage, RentalType } from '@shared/contracts/rental';
import { Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { fetchFavoriteStatus, fetchRental, getBrowseHistory, saveToBrowseHistory, toggleFavorite } from '@/shared/api/services';
import { frontendEnv } from '@/shared/config/env';
import { useAuthStore } from '@/shared/store';

import { CommentSection } from './components/CommentSection';
import { ReportPanel } from './components/ReportPanel';

import './index.scss';

const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  whole: '独住',
  shared: '同住',
  single: '单间',
  sublet: '转住',
  short: '短住'
};

const STAY_STAGE_LABELS: Record<RentalStayStage, string> = {
  living: '正在体验',
  moved_out: '已经离开',
  viewing: '看过没住',
  subletting: '转给别人'
};

function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex >= 0) return `${serverBase}${url.slice(uploadsIndex)}`;
  return url;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 屋檐故事详情页，展示照片、正文、参考信息、评论和举报入口。 */
export default function RentalDetailPage() {
  const [rental, setRental] = useState<RentalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const { isLoggedIn, profileStats, patchProfileStats } = useAuthStore();

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const id = params.id;
    if (!id) {
      void Taro.showToast({ title: '参数错误', icon: 'none' });
      setLoading(false);
      return;
    }
    const tasks: [Promise<RentalDetail>, Promise<{ isFavorited: boolean } | null>] = [
      fetchRental(id),
      isLoggedIn ? fetchFavoriteStatus(id) : Promise.resolve(null)
    ];
    Promise.all(tasks)
      .then(([data, favStatus]) => {
        setRental(data);
        const historyBefore = getBrowseHistory().length;
        saveToBrowseHistory(data);
        const historyAfter = getBrowseHistory().length;
        if (historyAfter !== historyBefore) {
          patchProfileStats({ browseCount: historyAfter });
        }
        if (favStatus) setIsFavorited(favStatus.isFavorited);
      })
      .catch(() => void Taro.showToast({ title: '加载屋檐故事失败', icon: 'none' }))
      .finally(() => setLoading(false));
  }, [isLoggedIn, patchProfileStats]);

  function handleToggleFavorite() {
    if (!isLoggedIn) {
      void Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!rental) return;
    toggleFavorite(rental.id)
      .then((status) => {
        setIsFavorited(status.isFavorited);
        patchProfileStats({
          favoriteCount: Math.max(0, profileStats.favoriteCount + (status.isFavorited ? 1 : -1))
        });
        void Taro.showToast({ title: status.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
      })
      .catch(() => void Taro.showToast({ title: '操作失败', icon: 'none' }));
  }

  if (loading) {
    return (
      <View className="detail-loading">
        <Text className="detail-loading__text">正在加载屋檐故事...</Text>
      </View>
    );
  }

  if (!rental) {
    return (
      <View className="detail-loading">
        <Text className="detail-loading__text">屋檐故事不存在</Text>
      </View>
    );
  }

  const photos = rental.photos.map(normalizePhotoUrl);
  const regionText = [rental.city, rental.district].filter(Boolean).join(' ') || rental.location;
  const landmarkText = rental.landmark || rental.address || rental.location;
  const proofSubmitted = rental.proofStatus === 'submitted';
  const priceText = rental.price ? `¥${rental.price}/月` : '待补充';

  return (
    <View className="detail-page">
      <ScrollView scrollY showScrollbar={false} className="detail-scroll">
        <View className="detail-gallery">
          {photos.length > 0 ? (
            <Swiper
              className="detail-gallery__swiper"
              indicatorDots={photos.length > 1}
              indicatorColor="#ffffff80"
              indicatorActiveColor="#ffffff"
              circular
            >
              {photos.map((url, i) => (
                <SwiperItem key={i}>
                  <Image src={url} className="detail-gallery__img" mode="aspectFill" />
                </SwiperItem>
              ))}
            </Swiper>
          ) : (
            <View className="detail-gallery__placeholder" />
          )}
        </View>

        <View className="detail-content">
          <View className="detail-card detail-card--main">
            <Text className="detail-title">{rental.title}</Text>
            <Text className="detail-meta">
              {regionText} · {formatDate(rental.createdAt)}
            </Text>
            {proofSubmitted && (
              <View className="detail-proof">
                <Text className="detail-proof__text">已提交凭证，仅供平台复核</Text>
              </View>
            )}
            <Text className="detail-experience">{rental.experience}</Text>
            {rental.tags.length > 0 && (
              <View className="detail-tags">
                {rental.tags.map((tag) => (
                  <View key={tag} className="detail-tag">
                    <Text className="detail-tag__text">{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="detail-card">
            <Text className="detail-card__title">参考信息</Text>
            <View className="detail-info-row">
              <Text className="detail-info-row__label">区域</Text>
              <Text className="detail-info-row__value">{regionText}</Text>
            </View>
            <View className="detail-divider" />
            <View className="detail-info-row">
              <Text className="detail-info-row__label">地点/地标</Text>
              <Text className="detail-info-row__value">{landmarkText}</Text>
            </View>
            <View className="detail-divider" />
            <View className="detail-info-row">
              <Text className="detail-info-row__label">费用</Text>
              <Text className="detail-info-row__value">{priceText}</Text>
            </View>
            <View className="detail-divider" />
            <View className="detail-info-row">
              <Text className="detail-info-row__label">空间类型</Text>
              <Text className="detail-info-row__value">{rental.roomType}</Text>
            </View>
            {rental.rentalType && (
              <>
                <View className="detail-divider" />
                <View className="detail-info-row">
                  <Text className="detail-info-row__label">居住方式</Text>
                  <Text className="detail-info-row__value">{RENTAL_TYPE_LABELS[rental.rentalType]}</Text>
                </View>
              </>
            )}
            {rental.stayStage && (
              <>
                <View className="detail-divider" />
                <View className="detail-info-row">
                  <Text className="detail-info-row__label">居住阶段</Text>
                  <Text className="detail-info-row__value">{STAY_STAGE_LABELS[rental.stayStage]}</Text>
                </View>
              </>
            )}
            {rental.area && (
              <>
                <View className="detail-divider" />
                <View className="detail-info-row">
                  <Text className="detail-info-row__label">面积</Text>
                  <Text className="detail-info-row__value">{rental.area}㎡</Text>
                </View>
              </>
            )}
            {rental.commute && (
              <>
                <View className="detail-divider" />
                <View className="detail-info-row">
                  <Text className="detail-info-row__label">通勤</Text>
                  <Text className="detail-info-row__value">{rental.commute}</Text>
                </View>
              </>
            )}
          </View>

          <CommentSection rentalId={rental.id} />
        </View>
      </ScrollView>

      <View className="detail-bottom">
        <View className="detail-fav-btn" onClick={handleToggleFavorite}>
          <Text className="detail-fav-btn__text">{isFavorited ? '已收藏' : '收藏'}</Text>
        </View>
        <View className="detail-report-btn" onClick={() => setReportVisible(true)}>
          <Text className="detail-report-btn__text">举报</Text>
        </View>
      </View>
      <ReportPanel rentalId={rental.id} visible={reportVisible} onClose={() => setReportVisible(false)} />
    </View>
  );
}
