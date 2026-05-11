import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { useState } from 'react';

import './index.scss';

const HERO_ITEMS = [
  {
    title: '一方屋檐下',
    subtitle: '用真实照片和文字留下居住的冷暖，给后来者一点确定感。',
    background: '#3f5f64'
  },
  {
    title: '屋檐里的明暗',
    subtitle: '通勤、隔音、采光、费用和周边生活，都可以被认真讨论。',
    background: '#7a5b48'
  },
  {
    title: '先落笔，再补充',
    subtitle: '先写下这段屋檐下的生活，之后再补充费用、区域和通勤等参考。',
    background: '#5f5d7a'
  }
];

/** 首页轮播：强调社区屋檐故事，而不是交易平台入口。 */
export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  return (
    <View className="hero-carousel">
      <Swiper
        className="hero-carousel__swiper"
        circular
        autoplay
        current={current}
        onChange={(event) => setCurrent(event.detail.current)}
      >
        {HERO_ITEMS.map((item) => (
          <SwiperItem key={item.title}>
            <View className="hero-carousel__item-wrapper">
              <View className="hero-carousel__item" style={{ background: item.background }}>
                <View className="hero-carousel__overlay" />
                <View className="hero-carousel__content">
                  <Text className="hero-carousel__eyebrow">居住笔友</Text>
                  <Text className="hero-carousel__title">{item.title}</Text>
                  <Text className="hero-carousel__subtitle">{item.subtitle}</Text>
                </View>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>
      <View className="hero-carousel__dots">
        {HERO_ITEMS.map((item, index) => (
          <View
            key={item.title}
            className={`hero-carousel__dot${current === index ? ' hero-carousel__dot--active' : ''}`}
          />
        ))}
      </View>
    </View>
  );
}
