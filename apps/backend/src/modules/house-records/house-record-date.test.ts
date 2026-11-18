import { describe, expect, it } from 'vitest';

import { getShanghaiDate, getTimelineDates, getTimelineRange } from './house-record-date';

describe('house record date', () => {
  it('只保留今天和真实历史日，去重、倒序并排除未来', () => {
    expect(getTimelineDates('2026-11-17', [
      '2026-09-02', '2026-11-17', '2026-11-15', '2026-09-02', '2026-11-18'
    ])).toEqual(['2026-11-17', '2026-11-15', '2026-09-02']);
  });

  it('今天占一个名额，最多保留最近 14 个历史日', () => {
    const dates = Array.from({ length: 20 }, (_, index) =>
      new Date(Date.UTC(2026, 7, 20 - index)).toISOString().slice(0, 10));
    const result = getTimelineDates('2026-11-17', dates.reverse());
    expect(result).toHaveLength(15);
    expect(result[0]).toBe('2026-11-17');
    expect(result[1]).toBe('2026-08-20');
    expect(result[14]).toBe('2026-08-07');
  });

  it('零历史只保留今天，不补空白日期', () => {
    expect(getTimelineDates('2026-11-17', [])).toEqual(['2026-11-17']);
  });

  it('uses the Asia/Shanghai calendar date', () => {
    expect(getShanghaiDate(new Date('2026-08-05T16:30:00.000Z'))).toBe('2026-08-06');
  });

  it('发现列表的近期统计仍使用含今天的 30 天范围', () => {
    expect(getTimelineRange('2026-08-06')).toEqual({
      start: '2026-07-08', end: '2026-08-06'
    });
  });
});
