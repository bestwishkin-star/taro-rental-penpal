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

const STAGE_LABELS: Record<string, string> = {
  living: '正在体验',
  moved_out: '已经离开',
  viewing: '看过没住',
  subletting: '转给别人'
};

function formatPrice(price?: string): string {
  return price && price !== '待补充' ? `¥${price}/月` : '费用待补充';
}

function buildMeta(item: RentalListing): string {
  const locationText = [item.city, item.district].filter(Boolean).join(' ') || item.location || '区域待补充';
  const stageText = item.stayStage ? STAGE_LABELS[item.stayStage] : '';
  return [locationText, formatPrice(item.price), stageText].filter(Boolean).join(' · ');
}

function getSummary(item: RentalListing): string {
  if (!item.contentPreview) return '';
  return item.contentPreview === item.title ? '' : item.contentPreview;
}

/** 屋檐故事卡片，突出标题、地点、标签和讨论热度。 */
export function RentalCard({ item, onClick }: Props) {
  const cover = item.photos[0];
  const coverUrl = cover ? normalizePhotoUrl(cover) : '';
  const metaText = buildMeta(item);
  const summary = getSummary(item);
  const hasProof = item.proofStatus === 'submitted';

  return (
    <View className="rental-card" onClick={onClick}>
      <View className={`rental-card__cover${coverUrl ? '' : ' rental-card__cover--placeholder'}`}>
        {coverUrl && <Image src={coverUrl} mode="aspectFill" className="rental-card__img" />}
        {!coverUrl && <Text className="rental-card__placeholder-text">屋檐故事</Text>}
      </View>
      <View className="rental-card__body">
        <Text className="rental-card__title">{item.title}</Text>
        <Text className="rental-card__meta-line">{metaText}</Text>
        {summary && <Text className="rental-card__desc">{summary}</Text>}
        {item.tags.length > 0 && (
          <View className="rental-card__tags">
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="rental-card__tag">
                <Text className="rental-card__tag-text">{tag}</Text>
              </View>
            ))}
          </View>
        )}
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
