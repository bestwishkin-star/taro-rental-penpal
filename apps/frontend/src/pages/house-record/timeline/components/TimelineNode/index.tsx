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

/** 可点击的真实更新日期节点。 */
export function TimelineNode({ node, x, y, variant, onClick }: TimelineNodeProps) {
  return (
    <View
      className={`timeline-node timeline-node--${variant}${
        node.isLatest ? ' timeline-node--latest' : ''
      }`}
      style={{ left: `${(x / 375) * 100}%`, top: `${y}px` }}
      hoverClass="timeline-node--pressed"
      hoverStayTime={80}
      ariaLabel={`${node.snapshotDate} 房屋实录`}
      onClick={onClick}
    >
      <View className="timeline-node__asset-wrap">
        <Image
          className="timeline-node__asset"
          src={variant === 'apple' ? appleAsset : blossomAsset}
          mode="aspectFit"
        />
        {node.isLatest && <View className="timeline-node__glow" />}
      </View>
      <Text className="timeline-node__date">{formatShortDate(node.snapshotDate)}</Text>
      {node.isLatest && <Text className="timeline-node__caption">今天</Text>}
    </View>
  );
}
