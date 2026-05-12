import { Image, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { useState } from 'react';

import heroDeskNote from '@/assets/images/home/hero-desk-note.png';
import heroNeighborhood from '@/assets/images/home/hero-neighborhood.png';
import heroWindowRoom from '@/assets/images/home/hero-window-room.png';

import './index.scss';

type HeroItem = {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
};

const HERO_ITEMS: HeroItem[] = [
  {
    eyebrow: '真实居住笔记',
    title: '窗边有光，也有答案',
    subtitle: '采光、隔音、通勤，把住过才知道的细节留给后来者。',
    image: heroWindowRoom
  },
  {
    eyebrow: '楼下生活切片',
    title: '楼下的日常，也算答案',
    subtitle: '菜场、地铁、夜路和烟火气，都是选择一间房的理由。',
    image: heroNeighborhood
  },
  {
    eyebrow: '写给后来者',
    title: '把居住冷暖写成路标',
    subtitle: '用照片和文字记录真实体验，让下一次选择更有底。',
    image: heroDeskNote
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
              <View className="hero-carousel__item">
                <Image className="hero-carousel__image" src={item.image} mode="aspectFill" />
                <View className="hero-carousel__overlay" />
                <View className="hero-carousel__content">
                  <Text className="hero-carousel__eyebrow">{item.eyebrow}</Text>
                  <Text className="hero-carousel__title">{item.title}</Text>
                  <Text className="hero-carousel__subtitle">{item.subtitle}</Text>
                </View>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>
    </View>
  );
}
