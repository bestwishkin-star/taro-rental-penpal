# 首页轮播生活拼贴优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页轮播从纯色文字卡片升级为「生活拼贴图片 + 前端文字标签」的真实居住感轮播。

**Architecture:** 继续复用现有 `HeroCarousel` 独立组件，不改首页其他区域、不改路由、不改接口。图片作为本地 PNG 资源引入，中文标题、副标题和标签全部由前端渲染，保证文案清晰和后续可维护。

**Tech Stack:** Taro、React、TypeScript、SCSS、本地 PNG 图片资源。

---

## 用户约束

- 不由助手运行测试或 typecheck，用户后续自行测试。
- 不在图片里生成中文、英文标语、水印、Logo 或 UI 字样。
- 图片要真实生活感，不要豪华样板间、酒店感或房地产广告感。
- 只改首页轮播，不改首页动作卡片和发布提示区域。
- 实现后不自动提交代码，除非用户明确要求提交。

## 文件结构

- Create: `apps/frontend/src/assets/images/home/`
  - 存放首页轮播生成图。
- Create: `apps/frontend/src/assets/images/home/hero-window-room.png`
  - 窗边房间主题图片。
- Create: `apps/frontend/src/assets/images/home/hero-neighborhood.png`
  - 楼下街区主题图片。
- Create: `apps/frontend/src/assets/images/home/hero-desk-note.png`
  - 书桌笔记主题图片。
- Modify: `apps/frontend/src/pages/home/components/HeroCarousel/index.tsx`
  - 引入本地图片，扩展轮播数据结构，渲染图片、遮罩、标题、副标题和标签。
- Modify: `apps/frontend/src/pages/home/components/HeroCarousel/index.scss`
  - 重写轮播视觉样式，包括图片容器、渐变遮罩、文字层、标签和圆点进度。

## Task 1: 生成并落地三张首页轮播图片

**Files:**
- Create: `apps/frontend/src/assets/images/home/hero-window-room.png`
- Create: `apps/frontend/src/assets/images/home/hero-neighborhood.png`
- Create: `apps/frontend/src/assets/images/home/hero-desk-note.png`

- [ ] **Step 1: 创建图片资源目录**

  使用项目内路径：

  ```text
  apps/frontend/src/assets/images/home/
  ```

- [ ] **Step 2: 生成「窗边房间」图片**

  使用内置图片生成工具生成项目图片。提示词：

  ```text
  Use case: photorealistic-natural
  Asset type: mobile app carousel banner background
  Primary request: a realistic lifestyle collage photo for a rental living community homepage
  Scene/backdrop: a modest rented room by a window in soft morning or afternoon natural light, with a desk, cup, notebook, curtain, small plant, and subtle balcony or wall corner details
  Subject: warm lived-in rental room details that suggest daylight, quietness, commute notes, and everyday life
  Style/medium: natural documentary-style photography, subtle film grain, low saturation, warm trustworthy tone
  Composition/framing: mobile horizontal banner, 2-3 collage-like slices blended naturally, leave the lower-left and bottom area visually calm for frontend text overlay
  Lighting/mood: soft natural light, warm, calm, credible, not luxurious
  Color palette: muted green, warm beige, soft cream, gentle amber
  Constraints: no text, no letters, no numbers, no logo, no watermark, no UI, no real estate ad feeling, no luxury hotel room, no model apartment
  Avoid: distorted rooms, unrealistic furniture, cluttered bottom-left area, dark unreadable corners
  ```

  保存为：

  ```text
  apps/frontend/src/assets/images/home/hero-window-room.png
  ```

- [ ] **Step 3: 生成「楼下街区」图片**

  提示词：

  ```text
  Use case: photorealistic-natural
  Asset type: mobile app carousel banner background
  Primary request: a realistic lifestyle collage photo for a rental neighborhood story
  Scene/backdrop: everyday street-level neighborhood near rental housing, including a small local shop, vegetable market corner, subway entrance hint, convenience store light, or quiet night street lamp
  Subject: neighborhood convenience and daily life around a rented home
  Style/medium: natural documentary-style photography, subtle film grain, low saturation, warm trustworthy tone
  Composition/framing: mobile horizontal banner, 2-3 collage-like slices blended naturally, leave the lower-left and bottom area visually calm for frontend text overlay
  Lighting/mood: warm evening or late afternoon light, human but not crowded, calm and credible
  Color palette: muted teal, warm amber, soft gray, cream highlights
  Constraints: no text, no letters, no numbers, no logo, no watermark, no UI, no real estate ad feeling, no luxury commercial street
  Avoid: busy crowds, recognizable brand signs, unreadable clutter where text will overlay, tourist landmark feeling
  ```

  保存为：

  ```text
  apps/frontend/src/assets/images/home/hero-neighborhood.png
  ```

- [ ] **Step 4: 生成「书桌笔记」图片**

  提示词：

  ```text
  Use case: photorealistic-natural
  Asset type: mobile app carousel banner background
  Primary request: a realistic lifestyle collage photo about recording rental experiences
  Scene/backdrop: a desk surface with rental-life notes, a phone showing blurred photo thumbnails without readable UI, a key, simple receipt-like papers without text, and a folded city map without labels
  Subject: writing down lived rental experience to help later renters
  Style/medium: natural documentary-style photography, subtle film grain, low saturation, warm trustworthy tone
  Composition/framing: mobile horizontal banner, 2-3 collage-like slices blended naturally, leave the lower-left and bottom area visually calm for frontend text overlay
  Lighting/mood: quiet desk lamp or soft afternoon light, reflective, practical, credible
  Color palette: warm paper beige, muted green, soft brown, gentle cream
  Constraints: no readable text, no letters, no numbers, no logo, no watermark, no UI, no real estate ad feeling
  Avoid: legible handwriting, branded phone UI, messy desk, overly staged office setup
  ```

  保存为：

  ```text
  apps/frontend/src/assets/images/home/hero-desk-note.png
  ```

- [ ] **Step 5: 人工检查图片**

  检查每张图：

  ```text
  1. 没有任何可读文字、水印、Logo 或 UI。
  2. 看起来像真实生活切片，不像房地产广告。
  3. 底部或左下区域有足够空间承载前端文字。
  4. 三张图主题分别对应房间、街区、记录。
  ```

## Task 2: 更新 HeroCarousel 数据和渲染结构

**Files:**
- Modify: `apps/frontend/src/pages/home/components/HeroCarousel/index.tsx`

- [ ] **Step 1: 更新组件导入**

  将组件导入改为包含 `Image`，并引入三张本地图片：

  ```tsx
  import { Image, Swiper, SwiperItem, Text, View } from '@tarojs/components';
  import { useState } from 'react';

  import heroDeskNote from '@/assets/images/home/hero-desk-note.png';
  import heroNeighborhood from '@/assets/images/home/hero-neighborhood.png';
  import heroWindowRoom from '@/assets/images/home/hero-window-room.png';

  import './index.scss';
  ```

- [ ] **Step 2: 定义轮播数据结构**

  在 `HERO_ITEMS` 前加入类型：

  ```tsx
  type HeroItem = {
    eyebrow: string;
    title: string;
    subtitle: string;
    tags: string[];
    image: string;
  };
  ```

- [ ] **Step 3: 替换 HERO_ITEMS**

  用设计稿里的三张内容替换原来的纯色背景数据：

  ```tsx
  const HERO_ITEMS: HeroItem[] = [
    {
      eyebrow: '真实居住笔记',
      title: '窗边有光，也有答案',
      subtitle: '采光、隔音、通勤，把住过才知道的细节留给后来者。',
      tags: ['采光', '隔音', '通勤'],
      image: heroWindowRoom
    },
    {
      eyebrow: '楼下生活切片',
      title: '楼下的日常，也算答案',
      subtitle: '菜场、地铁、夜路和烟火气，都是选择一间房的理由。',
      tags: ['街区', '地铁', '生活便利'],
      image: heroNeighborhood
    },
    {
      eyebrow: '写给后来者',
      title: '把居住冷暖写成路标',
      subtitle: '用照片和文字记录真实体验，让下一次选择更有底。',
      tags: ['真实记录', '费用参考', '避坑提醒'],
      image: heroDeskNote
    }
  ];
  ```

- [ ] **Step 4: 替换每个 SwiperItem 的内容结构**

  将原来的 `style={{ background: item.background }}` 结构改成图片承载结构：

  ```tsx
  <View className="hero-carousel__item">
    <Image className="hero-carousel__image" src={item.image} mode="aspectFill" />
    <View className="hero-carousel__overlay" />
    <View className="hero-carousel__content">
      <Text className="hero-carousel__eyebrow">{item.eyebrow}</Text>
      <Text className="hero-carousel__title">{item.title}</Text>
      <Text className="hero-carousel__subtitle">{item.subtitle}</Text>
      <View className="hero-carousel__tags">
        {item.tags.map((tag) => (
          <Text key={tag} className="hero-carousel__tag">
            {tag}
          </Text>
        ))}
      </View>
    </View>
  </View>
  ```

- [ ] **Step 5: 保留轮播状态逻辑**

  保留现有逻辑：

  ```tsx
  const [current, setCurrent] = useState(0);
  ```

  保留 `Swiper` 的：

  ```tsx
  circular
  autoplay
  current={current}
  onChange={(event) => setCurrent(event.detail.current)}
  ```

## Task 3: 重写 HeroCarousel 样式

**Files:**
- Modify: `apps/frontend/src/pages/home/components/HeroCarousel/index.scss`

- [ ] **Step 1: 调整轮播高度和容器**

  将轮播高度从 `180px` 提升到 `220px`，给图片和标签留出空间：

  ```scss
  .hero-carousel {
    margin-bottom: 28px;

    &__swiper {
      height: 220px;
    }

    &__item-wrapper {
      height: 220px;
      padding: 0;
      margin-right: 10px;
    }
  }
  ```

- [ ] **Step 2: 增加图片层**

  图片占满卡片，固定裁切方式由 `Image mode="aspectFill"` 控制：

  ```scss
  .hero-carousel {
    &__item {
      position: relative;
      height: 220px;
      border-radius: 22px;
      overflow: hidden;
      background: #304c4c;
      box-shadow: 0 16px 34px rgba(45, 36, 27, 0.18);
    }

    &__image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  }
  ```

- [ ] **Step 3: 改成渐变遮罩**

  遮罩既保证文字清晰，也保留图片细节：

  ```scss
  .hero-carousel {
    &__overlay {
      position: absolute;
      inset: 0;
      border-radius: 22px;
      background:
        linear-gradient(90deg, rgba(27, 34, 33, 0.78) 0%, rgba(27, 34, 33, 0.42) 48%, rgba(27, 34, 33, 0.12) 100%),
        linear-gradient(180deg, rgba(27, 34, 33, 0.06) 0%, rgba(27, 34, 33, 0.76) 100%);
    }
  }
  ```

- [ ] **Step 4: 调整文字层**

  文字固定在底部，字号控制在移动端安全范围：

  ```scss
  .hero-carousel {
    &__content {
      position: absolute;
      z-index: 1;
      left: 20px;
      right: 18px;
      bottom: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__eyebrow {
      color: #f7d99b;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    &__title {
      color: #fffaf2;
      font-size: 24px;
      font-weight: 800;
      line-height: 1.22;
    }

    &__subtitle {
      max-width: 295px;
      color: rgba(255, 250, 242, 0.84);
      font-size: 13px;
      line-height: 1.55;
    }
  }
  ```

- [ ] **Step 5: 增加标签样式**

  标签使用半透明胶囊，避免抢标题层级：

  ```scss
  .hero-carousel {
    &__tags {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    &__tag {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(255, 250, 242, 0.16);
      border: 1px solid rgba(255, 250, 242, 0.22);
      color: rgba(255, 250, 242, 0.88);
      font-size: 11px;
      line-height: 1.2;
    }
  }
  ```

- [ ] **Step 6: 优化圆点为进度感**

  当前圆点保留，但 active 状态拉长：

  ```scss
  .hero-carousel {
    &__dots {
      display: flex;
      flex-direction: row;
      justify-content: center;
      gap: 7px;
      margin-top: 12px;
    }

    &__dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: rgba(139, 119, 97, 0.25);
      transition: width 180ms ease, background 180ms ease;

      &--active {
        width: 20px;
        background: #d9a95f;
      }
    }
  }
  ```

## Task 4: 手动验收清单

**Files:**
- Read: `apps/frontend/src/pages/home/components/HeroCarousel/index.tsx`
- Read: `apps/frontend/src/pages/home/components/HeroCarousel/index.scss`

- [ ] **Step 1: 静态检查代码范围**

  确认只有以下范围发生实现改动：

  ```text
  apps/frontend/src/assets/images/home/
  apps/frontend/src/pages/home/components/HeroCarousel/index.tsx
  apps/frontend/src/pages/home/components/HeroCarousel/index.scss
  ```

- [ ] **Step 2: 用户手动运行页面**

  用户自行启动和测试项目。重点看：

  ```text
  1. 首页轮播能正常显示三张图片。
  2. 中文标题、副标题、标签清晰可读。
  3. 图片中没有任何可读文字、水印、Logo 或 UI。
  4. 自动轮播、圆点激活态正常。
  5. 小屏下标题、副标题、标签不重叠、不溢出。
  6. 首页动作卡片和发布提示区域没有被改动。
  ```

- [ ] **Step 3: 不执行自动化测试**

  按用户要求，本计划不安排助手运行：

  ```text
  pnpm typecheck
  pnpm test
  pnpm build
  ```

## 自查

- Spec 覆盖：三张图片主题、前端文字渲染、标签、轻量轮播动效、本地资源约束均有对应任务。
- 占位扫描：没有未定占位语或空泛执行项。
- 类型一致性：`HeroItem` 中的 `eyebrow`、`title`、`subtitle`、`tags`、`image` 与渲染结构一致。
- 用户约束：计划明确不由助手运行测试或 typecheck，且不自动提交实现代码。
