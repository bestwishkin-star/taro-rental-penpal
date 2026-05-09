import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { useState } from 'react';

import './index.scss';

// 首页轮播数据：每一项包含标题、副标题和远程背景图。
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

/** 首页头图轮播：自动播放并用自定义圆点展示当前页。 */
export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  return (
    <View className="hero-carousel">
      {/* 图片轮播主体：承载背景图、遮罩和文案。 */}
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
      {/* 自定义指示器：跟随 Swiper current 状态切换。 */}
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
