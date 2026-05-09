import type { RentalDetail } from '@shared/contracts/rental';
import { Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import {
  fetchFavoriteStatus,
  fetchRental,
  getBrowseHistory,
  saveToBrowseHistory,
  toggleFavorite
} from '@/shared/api/services';
import { frontendEnv } from '@/shared/config/env';
import { useAuthStore } from '@/shared/store';

import './index.scss';

/** 将后端返回的相对上传地址转换成当前 API 域名下的可访问图片地址。 */
function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex >= 0) return `${serverBase}${url.slice(uploadsIndex)}`;
  return url;
}

/** 根据标签内容选择卡片标签色，突出通勤、采光等常见卖点。 */
function getTagStyle(tag: string): 'accent' | 'green' | 'neutral' {
  if (tag.includes('地铁') || tag.includes('交通')) return 'accent';
  if (tag.includes('押') || tag.includes('朝南') || tag.includes('采光')) return 'green';
  return 'neutral';
}

/** 房源详情页：加载详情、收藏状态、浏览历史并展示联系入口。 */
export default function RentalDetailPage() {
  const [rental, setRental] = useState<RentalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const { isLoggedIn, profileStats, patchProfileStats } = useAuthStore();

  useEffect(() => {
    // 详情页依赖路由 id，同时并发加载房源详情和登录用户收藏状态。
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const id = params.id;
    if (!id) {
      void Taro.showToast({ title: '参数错误', icon: 'none' });
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
      .catch(() => void Taro.showToast({ title: '加载失败', icon: 'none' }))
      .finally(() => setLoading(false));
  }, [isLoggedIn, patchProfileStats]);

  /** 复制房源微信号，供用户跳转微信联系房东。 */
  function handleCopyWechat() {
    if (!rental?.wechat) return;
    void Taro.setClipboardData({ data: rental.wechat }).then(() => {
      void Taro.showToast({ title: '微信号已复制', icon: 'success' });
    });
  }

  /** 登录后切换收藏状态，并同步个人中心收藏计数。 */
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
          favoriteCount: Math.max(
            0,
            profileStats.favoriteCount + (status.isFavorited ? 1 : -1)
          )
        });
        void Taro.showToast({
          title: status.isFavorited ? '已收藏' : '已取消收藏',
          icon: 'none'
        });
      })
      .catch(() => void Taro.showToast({ title: '操作失败', icon: 'none' }));
  }

  if (loading) {
    return (
      <View className="detail-loading">
        <Text className="detail-loading__text">加载中...</Text>
      </View>
    );
  }

  if (!rental) {
    return (
      <View className="detail-loading">
        <Text className="detail-loading__text">房源不存在</Text>
      </View>
    );
  }

  // 渲染前统一整理图片和位置面积信息，避免 JSX 中重复拼装。
  const photos = rental.photos.map(normalizePhotoUrl);
  const metaParts = [rental.location];
  if (rental.area) metaParts.push(`${rental.area}㎡`);

  return (
    <View className="detail-page">
      <ScrollView scrollY showScrollbar={false} className="detail-scroll">
        {/* 顶部图片区：展示房源图片轮播或默认占位。 */}
        {/* 图片轮播 */}
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
          {/* 核心摘要区、基础信息区、描述区和联系方式区。 */}
          {/* 价格 & 标题卡 */}
          <View className="detail-card">
            <View className="detail-price-row">
              <Text className="detail-price">¥ {rental.price}</Text>
              <Text className="detail-price-unit">/月</Text>
            </View>
            <Text className="detail-title">{rental.title}</Text>
            <Text className="detail-meta">{metaParts.join(' · ')}</Text>
            {rental.tags.length > 0 && (
              <View className="detail-tags">
                {rental.tags.map((tag) => {
                  const style = getTagStyle(tag);
                  return (
                    <View key={tag} className={`detail-tag detail-tag--${style}`}>
                      <Text className={`detail-tag__text detail-tag__text--${style}`}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 基本信息卡 */}
          <View className="detail-card">
            <Text className="detail-card__title">基本信息</Text>
            <View className="detail-info-row">
              <Text className="detail-info-row__label">位置</Text>
              <Text className="detail-info-row__value">{rental.location}</Text>
            </View>
            <View className="detail-divider" />
            {rental.area ? (
              <>
                <View className="detail-info-row">
                  <Text className="detail-info-row__label">面积</Text>
                  <Text className="detail-info-row__value">{rental.area}㎡</Text>
                </View>
                <View className="detail-divider" />
              </>
            ) : null}
            <View className="detail-info-row">
              <Text className="detail-info-row__label">户型</Text>
              <Text className="detail-info-row__value">{rental.roomType}</Text>
            </View>
          </View>

          {/* 居住感受卡 */}
          {rental.experience ? (
            <View className="detail-card">
              <Text className="detail-card__title">居住感受</Text>
              <Text className="detail-experience">{rental.experience}</Text>
            </View>
          ) : null}

          {/* 联系方式卡 */}
          {rental.wechat ? (
            <View className="detail-card">
              <Text className="detail-card__title">联系方式</Text>
              <View className="detail-contact-row">
                <View className="detail-contact-row__left">
                  <Text className="detail-info-row__label">微信</Text>
                  <Text className="detail-contact-row__wechat">{rental.wechat}</Text>
                </View>
                <View className="detail-copy-btn" onClick={handleCopyWechat}>
                  <Text className="detail-copy-btn__text">复制</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      {/* 底部操作栏：收藏和复制联系方式的主要入口。 */}
      <View className="detail-bottom">
        <View className="detail-fav-btn" onClick={handleToggleFavorite}>
          <Text className="detail-fav-btn__text">{isFavorited ? '已收藏' : '收藏'}</Text>
        </View>
        <View className="detail-cta" onClick={handleCopyWechat}>
          <Text className="detail-cta__text">联系房东</Text>
        </View>
      </View>
    </View>
  );
}
