import type { HouseRecordListing } from '@shared/contracts/house-record';
import { Image, Text, View } from '@tarojs/components';

import defaultCover from '@/assets/images/home/hero-window-room.png';
import { frontendEnv } from '@/shared/config/env';

import './index.scss';

/** 房屋实录卡片属性。 */
interface HouseRecordCardProps {
  item: HouseRecordListing;
  onClick: () => void;
}

/** 将后端相对图片地址转换为小程序可访问的完整地址。 */
function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  return uploadsIndex >= 0 ? `${serverBase}${url.slice(uploadsIndex)}` : url;
}

/** 将自然日格式化为紧凑的社区更新时间。 */
function formatUpdateDate(snapshotDate: string): string {
  const [, month, day] = snapshotDate.split('-');
  if (!month || !day) return snapshotDate;
  return `${Number(month)}月${Number(day)}日更新`;
}

/** 照片优先的房屋实录卡片。 */
export function HouseRecordCard({ item, onClick }: HouseRecordCardProps) {
  const cover = item.coverPhoto ? normalizePhotoUrl(item.coverPhoto) : defaultCover;
  const avatar = item.author.avatar ? normalizePhotoUrl(item.author.avatar) : '';
  const authorInitial = item.author.nickname.trim().slice(0, 1) || '屋';

  return (
    <View
      className="house-record-card"
      hoverClass="house-record-card--pressed"
      hoverStayTime={80}
      onClick={onClick}
    >
      <Image className="house-record-card__cover" src={cover} mode="aspectFill" />
      <View className="house-record-card__body">
        <View className="house-record-card__author">
          {avatar ? (
            <Image className="house-record-card__avatar" src={avatar} mode="aspectFill" />
          ) : (
            <View className="house-record-card__avatar house-record-card__avatar--fallback">
              <Text className="house-record-card__avatar-text">{authorInitial}</Text>
            </View>
          )}
          <Text className="house-record-card__nickname">{item.author.nickname}</Text>
          <Text className="house-record-card__date">
            {formatUpdateDate(item.latestSnapshotDate)}
          </Text>
        </View>
        <Text className="house-record-card__story">{item.contentPreview || item.title}</Text>
        <View className="house-record-card__meta">
          <Text className="house-record-card__count">
            近30天留下 {item.recentUpdateCount} 次生活切片
          </Text>
          <Text className="house-record-card__enter">查看成长记录</Text>
        </View>
      </View>
    </View>
  );
}
