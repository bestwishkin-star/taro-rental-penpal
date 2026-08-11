import type { HouseRecordTimelineNode } from '@shared/contracts/house-record';
import { Image, Text, View } from '@tarojs/components';

import appleAsset from '@/assets/icons/house-record/node-apple.png';
import blossomAsset from '@/assets/icons/house-record/node-blossom.png';

import './index.scss';

/** 成长树日期节点属性。 */
interface TimelineNodeProps {
  node: HouseRecordTimelineNode;
  x: number;
  y: number;
  variant: 'apple' | 'blossom';
  onClick: () => void;
}

/** 将 YYYY-MM-DD 转换为节点内的短日期。 */
function formatShortDate(value: string): string {
  const [, month, day] = value.split('-');
  return month && day ? `${Number(month)}/${Number(day)}` : value;
}

/** 将活动状态转换为节点下方的短提示。 */
function getActivityCaption(node: HouseRecordTimelineNode): string | undefined {
  if (node.activityState === 'PRIVATE_ACTIVITY') return '未公开';
  if (node.activityState === 'REVIEW_PENDING') return '核验中';
  if (node.activityState === 'REVIEW_REJECTED_OWNER_ONLY') return '仅自己';
  return node.isLatest ? '今天' : undefined;
}

/** 可点击的真实更新日期节点。 */
export function TimelineNode({ node, x, y, variant, onClick }: TimelineNodeProps) {
  const activityState = node.activityState ?? 'PUBLIC_UPDATE';
  const compatibleNode = { ...node, activityState };
  const assetVariant = activityState === 'PUBLIC_UPDATE' ? 'apple' : 'blossom';
  const stateClass = activityState.toLowerCase().replace(/_/g, '-');
  const caption = getActivityCaption(compatibleNode);
  return (
    <View
      className={`timeline-node timeline-node--${variant} timeline-node--${stateClass}${
        node.isLatest ? ' timeline-node--latest' : ''
      }`}
      style={{ left: `${(x / 375) * 100}%`, top: `${y}px` }}
      hoverClass="timeline-node--pressed"
      hoverStayTime={80}
      ariaLabel={`${node.snapshotDate} 房屋实录 ${caption ?? '公开更新'}`}
      onClick={onClick}
    >
      <View className="timeline-node__asset-wrap">
        <Image
          className="timeline-node__asset"
          src={assetVariant === 'apple' ? appleAsset : blossomAsset}
          mode="aspectFit"
        />
        {node.isLatest && activityState === 'PUBLIC_UPDATE' && (
          <View className="timeline-node__glow" />
        )}
        {activityState === 'REVIEW_PENDING' && (
          <View className="timeline-node__review-ring" />
        )}
        {activityState === 'REVIEW_REJECTED_OWNER_ONLY' && (
          <View className="timeline-node__rejected-ring" />
        )}
      </View>
      <Text className="timeline-node__date">{formatShortDate(node.snapshotDate)}</Text>
      {caption && <Text className="timeline-node__caption">{caption}</Text>}
    </View>
  );
}
