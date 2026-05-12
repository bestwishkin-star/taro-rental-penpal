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

function getStoryText(item: RentalListing): string {
  return item.contentPreview || item.title;
}

/** 屋檐故事卡片，突出封面图和正文摘录。 */
export function RentalCard({ item, onClick }: Props) {
  const cover = item.photos[0];
  const coverUrl = cover ? normalizePhotoUrl(cover) : '';
  const storyText = getStoryText(item);
  const hasProof = item.proofStatus === 'submitted';

  return (
    <View className="rental-card" onClick={onClick}>
      <View className={`rental-card__cover${coverUrl ? '' : ' rental-card__cover--placeholder'}`}>
        {coverUrl && <Image src={coverUrl} mode="aspectFill" className="rental-card__img" />}
        {!coverUrl && <Text className="rental-card__placeholder-text">屋檐故事</Text>}
      </View>
      <View className="rental-card__body">
        <Text className="rental-card__desc">{storyText}</Text>
        <View className="rental-card__footer">
          <Text className="rental-card__footer-text">{item.commentCount ?? 0} 条讨论</Text>
          {typeof item.favoriteCount === 'number' && (
            <Text className="rental-card__footer-text">{item.favoriteCount} 人收藏</Text>
          )}
          {hasProof && (
            <View className="rental-card__proof">
              <Text className="rental-card__proof-text">已提交凭证</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
