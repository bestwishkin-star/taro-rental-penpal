import type { HouseModuleId } from '@shared/contracts/rental-space';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import iconArrowMore from '@/assets/icons/home-v2/icon-arrow-more.png';
import storyRainBalcony from '@/assets/images/home-v2/story-rain-balcony.png';
import storyWindowLight from '@/assets/images/home-v2/story-window-light.png';
import { frontendEnv } from '@/shared/config/env';

import './index.scss';

/** 首页可直接定位到公开快照点位的屋檐片段。 */
export interface RoofStoryItem {
  rentalId: string;
  snapshotDate: string;
  module: HouseModuleId;
  title: string;
  author: string;
  coverPhoto?: string;
}

/** 屋檐片段组件参数。 */
interface RoofStoriesProps {
  items: RoofStoryItem[];
  loading: boolean;
}

/** 点位在首页媒体流中的短名称。 */
const MODULE_LABELS: Record<HouseModuleId, string> = {
  kitchen: '厨房',
  bathroom: '卫生间',
  living: '客厅',
  bedroom: '卧室',
  hallway: '楼道',
  neighborhood: '周边'
};

/** 将服务端相对图片地址转换为小程序可访问地址。 */
function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  return uploadsIndex >= 0 ? `${serverBase}${url.slice(uploadsIndex)}` : url;
}

/** 将快照日期转换为首页短时间文案。 */
function formatSnapshotDate(snapshotDate: string): string {
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (snapshotDate === localToday) return '今天';
  const [, month, day] = snapshotDate.split('-');
  return month && day ? `${Number(month)}月${Number(day)}日` : snapshotDate;
}

/** 打开发现页的房屋实录列表。 */
function openStories() {
  void Taro.switchTab({ url: '/pages/find/index' });
}

/** 直接打开片段所属日期的房屋模型，并选中该空间点位。 */
function openStoryPoint(item: RoofStoryItem) {
  void Taro.navigateTo({
    url:
      `/pages/house-record/model/index?rentalId=${encodeURIComponent(item.rentalId)}` +
      `&snapshotDate=${encodeURIComponent(item.snapshotDate)}` +
      `&module=${encodeURIComponent(item.module)}`
  });
}

/** 横向屋檐媒体流，首张完整展示并露出下一张。 */
export function RoofStories({ items, loading }: RoofStoriesProps) {
  return (
    <View className="roof-stories">
      <View className="roof-stories__header">
        <Text className="roof-stories__title">屋檐片段</Text>
        <View className="roof-stories__more" hoverClass="roof-stories__more--active" onClick={openStories}>
          <Text className="roof-stories__more-label">查看全部</Text>
          <Image className="roof-stories__more-icon" src={iconArrowMore} mode="aspectFit" />
        </View>
      </View>

      <ScrollView className="roof-stories__viewport" scrollX showScrollbar={false}>
        <View className="roof-stories__track">
          {loading && items.length === 0 && (
            <View className="roof-stories__loading">
              <Text>正在翻看最近更新的生活片段...</Text>
            </View>
          )}
          {!loading && items.length === 0 && (
            <View className="roof-stories__loading">
              <Text>最近还没有公开的屋檐片段</Text>
            </View>
          )}
          {items.map((story, index) => (
            <View
              key={`${story.rentalId}-${story.snapshotDate}-${story.module}`}
              className={`roof-stories__item${index === 0 ? ' roof-stories__item--featured' : ''}`}
              hoverClass="roof-stories__item--active"
              onClick={() => openStoryPoint(story)}
            >
              <View className="roof-stories__media">
                <Image
                  className="roof-stories__image"
                  src={story.coverPhoto ? normalizePhotoUrl(story.coverPhoto) : index === 0 ? storyWindowLight : storyRainBalcony}
                  mode="aspectFill"
                />
                <View className="roof-stories__shade" />
                {index === 0 && (
                  <View className="roof-stories__badge">
                    <Text>刚刚更新</Text>
                  </View>
                )}
                <Text className="roof-stories__overlay-title">{story.title}</Text>
              </View>
              <View className="roof-stories__meta">
                <Text className="roof-stories__author">
                  {story.author} · {MODULE_LABELS[story.module]}
                </Text>
                <Text className="roof-stories__time">{formatSnapshotDate(story.snapshotDate)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
