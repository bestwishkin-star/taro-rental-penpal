import type { RentalListing } from '@shared/contracts/rental';
import { Image, Text, View } from '@tarojs/components';

import { frontendEnv } from '@/shared/config/env';

import './index.scss';

/** 个人屋檐故事卡片属性。 */
interface RentalStoryCardProps {
  item: RentalListing;
  onClick: () => void;
}

/** 将后端相对图片地址转换为小程序可访问的完整地址。 */
function normalizePhotoUrl(url: string): string {
  const apiBaseUrl = frontendEnv.apiBaseUrl;
  // API 地址通常以 /api 结尾，图片静态资源需要使用服务根地址。
  const serverBase = apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
  if (url.startsWith('/')) return serverBase + url;

  // 兼容数据库中保留了服务器本地前缀的历史图片地址。
  const uploadsIndex = url.indexOf('/uploads/');
  return uploadsIndex >= 0 ? serverBase + url.slice(uploadsIndex) : url;
}

/** 优先展示正文摘要，并使用标题兼容没有摘要的历史记录。 */
function getStoryText(item: RentalListing): string {
  return item.contentPreview || item.title;
}

/** 用于我的屋檐记、收藏和浏览历史的故事卡片。 */
export function RentalStoryCard({ item, onClick }: RentalStoryCardProps) {
  const cover = item.photos[0];
  const coverUrl = cover ? normalizePhotoUrl(cover) : '';
  const storyText = getStoryText(item);
  const hasProof = item.proofStatus === 'submitted';
  const coverClassName = 'rental-card__cover' + (coverUrl ? '' : ' rental-card__cover--placeholder');

  return (
    <View className="rental-card" onClick={onClick}>
      <View className={coverClassName}>
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
