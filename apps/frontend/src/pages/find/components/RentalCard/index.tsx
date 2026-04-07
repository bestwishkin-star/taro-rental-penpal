import { Image, Text, View } from '@tarojs/components';
import { useState } from 'react';

import type { RentalListing } from '@shared/contracts/rental';

import { frontendEnv } from '@/shared/config/env';

import './index.scss';

interface Props {
  item: RentalListing;
  onClick?: () => void;
}

function getTagStyle(tag: string): 'accent' | 'green' | 'neutral' {
  if (tag.includes('地铁') || tag.includes('交通')) return 'accent';
  if (tag.includes('押') || tag.includes('朝南') || tag.includes('采光')) return 'green';
  return 'neutral';
}

/** 将存储的图片绝对 URL 替换为当前 serverBase，兼容 IP 变更 */
function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return `${serverBase}${url}`;
  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex >= 0) return `${serverBase}${url.slice(uploadsIndex)}`;
  return url;
}

export function RentalCard({ item, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const displayTags = item.tags.slice(0, 2);
  const rawPhoto = item.photos[0];
  const coverPhoto = rawPhoto ? normalizePhotoUrl(rawPhoto) : undefined;
  const metaParts = [item.location];
  if (item.area) metaParts.push(`${item.area}㎡`);

  return (
    <View className="rental-card" onClick={onClick}>
      {coverPhoto && !imgError ? (
        <Image
          src={coverPhoto}
          className="rental-card__image"
          mode="aspectFill"
          onError={() => setImgError(true)}
        />
      ) : (
        <View className="rental-card__image rental-card__image--placeholder" />
      )}
      <View className="rental-card__content">
        <Text className="rental-card__title" numberOfLines={2}>
          {item.title}
        </Text>
        {displayTags.length > 0 && (
          <View className="rental-card__tags">
            {displayTags.map((tag) => {
              const style = getTagStyle(tag);
              return (
                <View key={tag} className={`rental-card__tag rental-card__tag--${style}`}>
                  <Text className={`rental-card__tag-text rental-card__tag-text--${style}`}>
                    {tag}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <Text className="rental-card__meta">{metaParts.join(' · ')}</Text>
        <View className="rental-card__price-row">
          <Text className="rental-card__price">¥ {item.price}</Text>
          <Text className="rental-card__price-unit">/月</Text>
        </View>
      </View>
    </View>
  );
}
