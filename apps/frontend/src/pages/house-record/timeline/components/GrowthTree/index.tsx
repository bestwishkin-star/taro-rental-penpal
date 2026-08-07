import type { HouseRecordTimelineNode } from '@shared/contracts/house-record';
import { Image, Text, View } from '@tarojs/components';

import sceneAsset from '../../assets/images/growth-tree-scene.webp';
import { createTimelineLayout } from '../../timeline-layout';
import { TimelineNode } from '../TimelineNode';

import './index.scss';

/** 成长树场景属性。 */
interface GrowthTreeProps {
  nodes: HouseRecordTimelineNode[];
  onSelect: (node: HouseRecordTimelineNode) => void;
}

/** 节点上下间距，与 Pencil 长场景的枝干节奏保持一致。 */
const NODE_STEP = 92;

/** 根据真实更新数量渲染可滚动成长树。 */
export function GrowthTree({ nodes, onSelect }: GrowthTreeProps) {
  const layout = createTimelineLayout(nodes);
  const sceneHeight = Math.max(844, 260 + nodes.length * NODE_STEP);

  return (
    <View className="growth-tree" style={{ height: `${sceneHeight}px` }}>
      <Image className="growth-tree__scene" src={sceneAsset} mode="scaleToFill" />
      <View className="growth-tree__veil" />
      <View className="growth-tree__heading">
        <Text className="growth-tree__eyebrow">近30天</Text>
        <Text className="growth-tree__title">沿着枝叶，翻看住在这里的日子</Text>
        <Text className="growth-tree__summary">共留下 {nodes.length} 次真实更新</Text>
      </View>
      {layout.map((item) => (
        <TimelineNode
          key={item.snapshotDate}
          node={item}
          x={item.x}
          y={item.y}
          variant={item.variant}
          onClick={() => onSelect(item)}
        />
      ))}
    </View>
  );
}
