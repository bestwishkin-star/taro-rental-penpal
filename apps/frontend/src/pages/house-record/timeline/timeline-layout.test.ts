import { describe, expect, it } from 'vitest';

import { createTimelineLayout, TREE_SCENE_SIZE } from './timeline-layout';

describe('createTimelineLayout', () => {
  it('15 个真实日期分别落在树内，不会重叠到同一个锚点', () => {
    const nodes = Array.from({ length: 15 }, (_, index) => ({
      snapshotDate: new Date(Date.UTC(2026, 10, 17 - index * 4)).toISOString().slice(0, 10),
      hasRecord: index !== 0
    }));
    const result = createTimelineLayout(nodes);
    expect(result).toHaveLength(15);
    expect(result.map((item) => item.snapshotDate)).toEqual(nodes.map((item) => item.snapshotDate));
    expect(new Set(result.map((item) => item.x + ',' + item.y)).size).toBe(15);
    expect(result.every((item) => item.x > 29 && item.x < TREE_SCENE_SIZE.width - 29 && item.y > 73 && item.y < TREE_SCENE_SIZE.height - 98)).toBe(true);
  });

  it('只有今天时不伪造历史节点', () => {
    const result = createTimelineLayout([{ snapshotDate: '2026-11-17', hasRecord: false }]);
    expect(result).toHaveLength(1);
    expect(result[0].variant).toBe('blossom');
  });

  it('所有已上报日期都是果子，包含私密和审核中的记录', () => {
    const result = createTimelineLayout([
      { snapshotDate: '2026-11-17', hasRecord: false, activityState: 'NOT_REPORTED' },
      { snapshotDate: '2026-10-16', hasRecord: true, activityState: 'PRIVATE_ACTIVITY' },
      { snapshotDate: '2026-09-15', hasRecord: true, activityState: 'REVIEW_PENDING' },
      { snapshotDate: '2026-08-14', hasRecord: true, activityState: 'PUBLIC_UPDATE' },
      { snapshotDate: '2026-07-13', hasRecord: true, activityState: 'REVIEW_REJECTED_OWNER_ONLY' }
    ]);
    expect(result.map((node) => node.variant)).toEqual(['blossom', 'apple', 'apple', 'apple', 'apple']);
  });
});
