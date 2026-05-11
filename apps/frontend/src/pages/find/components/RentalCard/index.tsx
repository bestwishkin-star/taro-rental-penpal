import type { RentalListing } from '@shared/contracts/rental';
import { Image, Text, View } from '@tarojs/components';

import { frontendEnv } from '@/shared/config/env';

import './index.scss';

interface Props {
  item: RentalListing;
  onClick: () => void;
}

function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex >= 0) return `${serverBase}${url.slice(uploadsIndex)}`;
  return url;
}

/** 屋檐故事卡片，突出标题、地点、标签和讨论热度。 */
export function RentalCard({ item, onClick }: Props) {
  const cover = item.photos[0];
  const coverUrl = cover ? normalizePhotoUrl(cover) : '';
  const locationText = [item.city, item.district].filter(Boolean).join(' ') || item.location;
  const priceText = item.price ? `¥${item.price}/月` : '参考信息待补充';

  return (
    <View className="rental-card" onClick={onClick}>
      <View className="rental-card__cover">
        {coverUrl ? <Image src={coverUrl} mode="aspectFill" className="rental-card__img" /> : null}
        <View className="rental-card__cover-mask" />
        <View className="rental-card__price">
          <Text className="rental-card__price-text">{priceText}</Text>
        </View>
      </View>
      <View className="rental-card__body">
        <Text className="rental-card__title">{item.title}</Text>
        <Text className="rental-card__location">{locationText}</Text>
        <Text className="rental-card__desc">{item.contentPreview || item.title}</Text>
        {item.tags.length > 0 && (
          <View className="rental-card__tags">
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="rental-card__tag">
                <Text className="rental-card__tag-text">{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <View className="rental-card__meta">
          <Text className="rental-card__meta-text">{item.commentCount} 条讨论</Text>
        </View>
      </View>
    </View>
  );
}
