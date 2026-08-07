/** 节点沿树干左右交替分布的稳定横坐标序列。 */
const X_PATTERN = [164, 64, 236, 280, 116, 36, 208, 276];

/**
 * 只为接口真实返回的日期生成视觉坐标，不补齐未更新日期。
 * 服务端按日期倒序返回，因此数组首项始终位于树冠顶部。
 */
export function createTimelineLayout<T extends { snapshotDate: string; isLatest: boolean }>(nodes: T[]) {
  return nodes.map((node, index) => ({
    ...node,
    x: X_PATTERN[index % X_PATTERN.length],
    y: 144 + index * 92,
    variant: node.isLatest || index % 6 === 5 ? ('apple' as const) : ('blossom' as const)
  }));
}
