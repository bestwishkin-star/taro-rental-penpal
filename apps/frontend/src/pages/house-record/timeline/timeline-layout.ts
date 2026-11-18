/** 设计稿背景与日期节点共用 375 × 1125 坐标系，只等比缩放。 */
export const TREE_SCENE_SIZE = { width: 375, height: 1125 } as const;

/** 顺着不规则枝条放置：长短、方向和节点间隔均取自 Pencil 设计稿。 */
const BRANCH_ANCHORS = [
  [238, 114],
  [137, 214], [68, 207],
  [235, 304], [314, 287],
  [135, 441], [64, 431],
  [225, 517], [310, 501],
  [160, 656], [74, 640],
  [244, 768], [318, 747],
  [150, 882], [70, 870]
] as const;

/** 展示接口选出的今天与历史节点，花果仅由是否上报决定。 */
export function createTimelineLayout<T extends { snapshotDate: string; hasRecord: boolean }>(nodes: T[]) {
  return nodes.slice(0, BRANCH_ANCHORS.length).map((node, index) => {
    const [x, y] = BRANCH_ANCHORS[index];
    return { ...node, x, y, order: index, variant: node.hasRecord ? ('apple' as const) : ('blossom' as const) };
  });
}
