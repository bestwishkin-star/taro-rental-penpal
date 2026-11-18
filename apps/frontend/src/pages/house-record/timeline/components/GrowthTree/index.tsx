import type { HouseRecordTimelineNode } from '@shared/contracts/house-record';
import { Button, Image, Text, View } from '@tarojs/components';
import { useState } from 'react';

import leafAsset from '@/assets/icons/house-record/growth-leaves.png';
import appleAsset from '@/assets/icons/house-record/level-apple.png';
import blossomAsset from '@/assets/icons/house-record/level-blossom.png';

import sceneAsset from '../../assets/images/growth-tree-organic.webp';
import { createTimelineLayout } from '../../timeline-layout';
import { TimelineNode } from '../TimelineNode';

import './index.scss';

/** 自然成长树属性；页面隐藏时暂停持续动效。 */
interface GrowthTreeProps {
  nodes: HouseRecordTimelineNode[];
  isOwner: boolean;
  isVisible?: boolean;
  onSelect: (node: HouseRecordTimelineNode) => void;
}

/** 保留今天和真实历史节点，在不规则枝条上回看最近的记录。 */
export function GrowthTree({ nodes, isOwner, isVisible = true, onSelect }: GrowthTreeProps) {
  const [motionPaused, setMotionPaused] = useState(false);
  const layout = createTimelineLayout(nodes);
  const today = nodes.find((node) => node.isToday);
  const historyCount = nodes.filter((node) => !node.isToday).length;
  const reportedDays = nodes.filter((node) => node.hasRecord).length;

  return (
    <View className={'growth-tree' + (motionPaused || !isVisible ? ' growth-tree--paused' : '')}>
      <View className="growth-tree__heading">
        <View className="growth-tree__heading-row">
          <Text className="growth-tree__title">屋檐成长树</Text>
          {isOwner && today && (
            <Button className="growth-tree__today" hoverClass="growth-tree__today--pressed" onClick={() => onSelect(today)}>
              {today.hasRecord ? '今日记录' : '记录今天'}
            </Button>
          )}
        </View>
        <Text className="growth-tree__range">
          {historyCount > 0 ? '今天 + 最近 ' + historyCount + ' 个有记录的日子' : '从今天开始，让第一朵花结成果实'}
        </Text>
        <View className="growth-tree__summary-row">
          <Text className="growth-tree__summary">已记录 {reportedDays} 天</Text>
          <View className="growth-tree__legend">
            <View className="growth-tree__legend-item"><Image src={blossomAsset} className="growth-tree__legend-icon" mode="aspectFit" /><Text>未上报</Text></View>
            <View className="growth-tree__legend-item"><Image src={appleAsset} className="growth-tree__legend-icon" mode="aspectFit" /><Text>已上报</Text></View>
          </View>
          <Button className="growth-tree__motion" ariaLabel={motionPaused ? '开启动效' : '暂停动效'} onClick={() => setMotionPaused(!motionPaused)}>
            {motionPaused ? '动效关' : '动效开'}
          </Button>
        </View>
      </View>
      <View className="growth-tree__scene">
        <Image className="growth-tree__image" src={sceneAsset} mode="aspectFit" />
        {[0, 1, 2].map((index) => (
          <Image key={index} className={'growth-tree__leaf growth-tree__leaf--' + index} src={leafAsset} mode="aspectFit" />
        ))}
        {[0, 1, 2, 3].map((index) => <View key={index} className={'growth-tree__pollen growth-tree__pollen--' + index} />)}
        {layout.map((item) => (
          <TimelineNode key={item.snapshotDate} node={item} x={item.x} y={item.y} order={item.order}
            variant={item.variant} isOwner={isOwner} onClick={() => onSelect(item)} />
        ))}
      </View>
      <View className="growth-tree__footer">
        <Text className="growth-tree__footer-title">让每一次记录，在树上慢慢结果</Text>
        <Text className="growth-tree__hint">{isOwner ? '今天可上报 · 果实可回看' : '已上报的日子，都留在这棵树上'}</Text>
      </View>
    </View>
  );
}
