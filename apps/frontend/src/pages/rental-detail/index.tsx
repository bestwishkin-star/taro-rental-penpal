import type { RentalDetail } from '@shared/contracts/rental';
import { Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { fetchRental } from '@/shared/api/services';
import { frontendEnv } from '@/shared/config/env';

import './index.scss';

function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex >= 0) return `${serverBase}${url.slice(uploadsIndex)}`;
  return url;
}

function getTagStyle(tag: string): 'accent' | 'green' | 'neutral' {
  if (tag.includes('地铁') || tag.includes('交通')) return 'accent';
  if (tag.includes('押') || tag.includes('朝南') || tag.includes('采光')) return 'green';
  return 'neutral';
}

export default function RentalDetailPage() {
  const [rental, setRental] = useState<RentalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    const id = params.id;
    if (!id) {
      void Taro.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    fetchRental(id)
      .then((data) => setRental(data))
      .catch(() => void Taro.showToast({ title: '加载失败', icon: 'none' }))
      .finally(() => setLoading(false));
  }, []);

  function handleCopyWechat() {
    if (!rental?.wechat) return;
    void Taro.setClipboardData({ data: rental.wechat }).then(() => {
      void Taro.showToast({ title: '微信号已复制', icon: 'success' });
    });
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

  const photos = rental.photos.map(normalizePhotoUrl);
  const metaParts = [rental.location];
  if (rental.area) metaParts.push(`${rental.area}㎡`);

  return (
    <View className="detail-page">
      <ScrollView scrollY showScrollbar={false} className="detail-scroll">
        {/* 图片轮播 */}
        <View className="detail-gallery">
          {photos.length > 0 ? (
            <Swiper className="detail-gallery__swiper" indicatorDots={photos.length > 1} indicatorColor="#ffffff80" indicatorActiveColor="#ffffff" circular>
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
              <Text className="detail-privacy">🔒 联系方式仅对你本人可见</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="detail-bottom">
        <View className="detail-cta" onClick={handleCopyWechat}>
          <Text className="detail-cta__text">联系房东</Text>
        </View>
      </View>
    </View>
  );
}
