import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { useState } from 'react';

import './index.scss';

const SLIDES = [
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

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  return (
    <View className="hero-carousel">
      <Swiper
        className="hero-carousel__swiper"
        indicatorDots={false}
        autoplay
        interval={5000}
        circular
        onChange={(e) => setCurrent(e.detail.current)}
      >
        {SLIDES.map((slide, index) => (
          <SwiperItem key={index}>
            <View className="hero-carousel__item-wrapper">
              <View
                className="hero-carousel__item"
                style={{ backgroundImage: `url(${slide.bgImage})` }}
              >
                <View className="hero-carousel__overlay" />
                <View className="hero-carousel__content">
                  <Text className="hero-carousel__eyebrow">租房笔友</Text>
                  <Text className="hero-carousel__title">{slide.title}</Text>
                  <Text className="hero-carousel__subtitle">{slide.subtitle}</Text>
                </View>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>
      <View className="hero-carousel__dots">
        {SLIDES.map((_, index) => (
          <View
            key={index}
            className={`hero-carousel__dot${current === index ? ' hero-carousel__dot--active' : ''}`}
          />
        ))}
      </View>
    </View>
  );
}
