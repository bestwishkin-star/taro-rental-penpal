import { describe, expect, it } from 'vitest';

import { getShanghaiDate, getTimelineRange } from './house-record-date';

describe('house record date', () => {
  it('uses the Asia/Shanghai calendar date', () => {
    expect(getShanghaiDate(new Date('2026-08-05T16:30:00.000Z'))).toBe('2026-08-06');
  });

  it('includes the end date in a 30-day range', () => {
    expect(getTimelineRange('2026-08-06')).toEqual({
      start: '2026-07-08',
      end: '2026-08-06',
    });
  });
});
