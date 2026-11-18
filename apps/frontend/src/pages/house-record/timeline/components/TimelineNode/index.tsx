import type { HouseRecordTimelineNode } from '@shared/contracts/house-record';
import { Button, Image, Text, View } from '@tarojs/components';

import appleAsset from '@/assets/icons/house-record/level-apple.png';
import blossomAsset from '@/assets/icons/house-record/level-blossom.png';

import { TREE_SCENE_SIZE } from '../../timeline-layout';

import './index.scss';

/** 日期关卡属性，坐标来自设计稿。 */
interface TimelineNodeProps {
  node: HouseRecordTimelineNode;
  x: number;
  y: number;
  order: number;
  variant: 'apple' | 'blossom';
  isOwner: boolean;
  onClick: () => void;
}

/** 公开性和审核状态独立于花果状态。 */
function getRecordCaption(node: HouseRecordTimelineNode): string {
  if (!node.hasRecord) return '未上报';
  if (node.activityState === 'PRIVATE_ACTIVITY') return '已上报，未公开';
  if (node.activityState === 'REVIEW_PENDING') return '已上报，核验中';
  if (node.activityState === 'REVIEW_REJECTED_OWNER_ONLY') return '已上报，仅自己可见';
  return '已上报';
}

/** 锚点保持不动，仅让花果轻浮动，避免点击目标跟着晃动。 */
export function TimelineNode({ node, x, y, order, variant, isOwner, onClick }: TimelineNodeProps) {
  return (
    <Button
      className={'timeline-node timeline-node--' + variant + (node.isToday ? ' timeline-node--today' : '')}
      style={{ left: (x / TREE_SCENE_SIZE.width) * 100 + '%', top: (y / TREE_SCENE_SIZE.height) * 100 + '%' }}
      hoverClass="timeline-node--pressed"
      ariaLabel={node.snapshotDate + '，' + getRecordCaption(node)}
      onClick={onClick}
    >
      <View className="timeline-node__content" style={{ animationDelay: Math.min(order, 10) * 35 + 'ms' }}>
        {node.isToday && <View className="timeline-node__ring" />}
        {node.isToday && <Text className="timeline-node__tip">{node.hasRecord ? '查看今日记录' : isOwner ? '点击记录今天' : '今天未上报'}</Text>}
        <Image className="timeline-node__asset" src={variant === 'apple' ? appleAsset : blossomAsset} mode="aspectFit"
          style={{ animationDelay: -order * 0.37 + 's', animationDuration: 4 + (order % 3) * 0.6 + 's' }} />
        <Text className="timeline-node__date">{node.isToday ? '今天' : node.snapshotDate.slice(5).replace('-', '/')}</Text>
        {node.activityState === 'REVIEW_PENDING' && <Text className="timeline-node__status">核验中</Text>}
        {node.activityState === 'PRIVATE_ACTIVITY' && <Text className="timeline-node__status">未公开</Text>}
        {node.activityState === 'REVIEW_REJECTED_OWNER_ONLY' && <Text className="timeline-node__status">仅自己</Text>}
      </View>
    </Button>
  );
}
