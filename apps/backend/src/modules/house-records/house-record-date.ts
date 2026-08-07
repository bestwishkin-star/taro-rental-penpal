import type { HouseRecordDateRange } from './house-record.types';

/** 房屋实录按中国标准时间划分自然日。 */
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
/** 公开成长树固定展示最近 30 个自然日。 */
const TIMELINE_DAYS = 30;

/** 复用格式化器，避免每次请求重复创建 Intl 对象。 */
const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHANGHAI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 返回指定时刻在上海时区对应的 YYYY-MM-DD 自然日。 */
export function getShanghaiDate(date = new Date()): string {
  const parts = shanghaiDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** 返回包含结束日在内、向前 29 天的公开时间线闭区间。 */
export function getTimelineRange(end: string): HouseRecordDateRange {
  const startAtNoon = new Date(`${end}T12:00:00+08:00`);
  startAtNoon.setUTCDate(startAtNoon.getUTCDate() - (TIMELINE_DAYS - 1));

  return {
    start: getShanghaiDate(startAtNoon),
    end,
  };
}
