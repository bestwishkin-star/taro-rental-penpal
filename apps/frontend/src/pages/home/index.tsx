import { Text, View, Swiper, SwiperItem } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import './index.scss';

const HERO_SLIDES = [
  {
    title: '寻一处心安之所',
    subtitle: '每个房间都藏着一个故事，每次相遇都是一段缘分',
    bgImage: 'https://images.unsplash.com/photo-1759139445627-5ce9d5fac8f9?w=800&q=80'
  },
  {
    title: '遇见理想的栖居',
    subtitle: '温暖的空间，志趣相投的伙伴，开启美好生活',
    bgImage: 'https://images.unsplash.com/photo-1658288644949-4c09a9b30435?w=800&q=80'
  },
  {
    title: '在这里，找到归属感',
    subtitle: '不只是一间房，更是一段温暖的旅程与陪伴',
    bgImage: 'https://images.unsplash.com/photo-1762845872088-12c352bbb119?w=800&q=80'
  }
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useDidShow(() => {
    setTabBarSelected(0);
  });

  return (
    <PageShell>
      <View className="home-hero-carousel">
        <Swiper
          className="home-hero-swiper"
          indicatorDots={false}
          autoplay
          interval={5000}
          circular
          onChange={(e) => setCurrentSlide(e.detail.current)}
        >
          {HERO_SLIDES.map((slide, index) => (
            <SwiperItem key={index}>
              <View className="home-hero-wrapper">
                <View className="home-hero" style={{ backgroundImage: `url(${slide.bgImage})` }}>
                  <View className="home-hero__overlay" />
                  <View className="home-hero__content">
                    <Text className="home-hero__eyebrow">租房笔友</Text>
                    <Text className="home-hero__title">{slide.title}</Text>
                    <Text className="home-hero__subtitle">{slide.subtitle}</Text>
                  </View>
                </View>
              </View>
            </SwiperItem>
          ))}
        </Swiper>
        <View className="home-hero-dots">
          {HERO_SLIDES.map((_, index) => (
            <View
              key={index}
              className={`home-hero-dot${currentSlide === index ? ' home-hero-dot--active' : ''}`}
            />
          ))}
        </View>
      </View>

      <View className="home-actions">
        <View
          className="home-action-card home-action-card--find"
          hoverClass="home-action-card--active"
          onClick={() => void Taro.switchTab({ url: '/pages/find/index' })}
        >
          <View className="home-action-card__icon-wrap">
            <Text className="home-action-card__icon">🏠</Text>
          </View>
          <View className="home-action-card__body">
            <Text className="home-action-card__label">我要找房</Text>
            <Text className="home-action-card__desc">浏览附近房源，找到心仪的住所</Text>
          </View>
          <Text className="home-action-card__arrow">›</Text>
        </View>

        <View
          className="home-action-card home-action-card--share"
          hoverClass="home-action-card--active"
          onClick={() => void Taro.navigateTo({ url: '/pages/share/index' })}
        >
          <View className="home-action-card__icon-wrap home-action-card__icon-wrap--share">
            <Text className="home-action-card__icon">📋</Text>
          </View>
          <View className="home-action-card__body">
            <Text className="home-action-card__label">我要分享</Text>
            <Text className="home-action-card__desc">发布你的房源信息，寻找合适的室友</Text>
          </View>
          <Text className="home-action-card__arrow">›</Text>
        </View>
      </View>

      <View className="home-tips">
        <Text className="home-tips__title">温馨提示</Text>
        <Text className="home-tips__text">真实信息，安全交流，共建友好社区</Text>
      </View>
    </PageShell>
  );
}
