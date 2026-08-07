import { describe, expect, it } from 'vitest';

import { createTimelineLayout } from './timeline-layout';

describe('createTimelineLayout', () => {
  it('only lays out returned dates with the latest node at the top', () => {
    const result = createTimelineLayout([
      { snapshotDate: '2026-08-06', isLatest: true },
      { snapshotDate: '2026-08-03', isLatest: false }
    ]);

    expect(result.map((item) => item.snapshotDate)).toEqual(['2026-08-06', '2026-08-03']);
    expect(result).toHaveLength(2);
    expect(result[0].y).toBeLessThan(result[1].y);
  });

  it('does not fill missing dates between returned nodes', () => {
    const result = createTimelineLayout([
      { snapshotDate: '2026-08-06', isLatest: true },
      { snapshotDate: '2026-07-28', isLatest: false }
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.snapshotDate)).toEqual(['2026-08-06', '2026-07-28']);
  });
});
