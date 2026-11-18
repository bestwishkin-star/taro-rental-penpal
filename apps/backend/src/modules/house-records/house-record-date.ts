import type { HouseRecordDateRange } from './house-record.types';

/** 房屋实录按中国标准时间划分自然日。 */
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
/** 发现列表的近期更新统计仍按 30 个自然日计算。 */
const RECENT_UPDATE_DAYS = 30;
/** 成长树为今天预留一个节点，其余展示最近 14 个有记录的历史日期。 */
const TIMELINE_HISTORY_DAYS = 14;

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

/** 今天始终置顶；历史按日期倒序去重，只取已有记录的最近 14 天。 */
export function getTimelineDates(today: string, recordedDates: string[]): string[] {
  const history = [...new Set(recordedDates)]
    .filter((date) => date < today)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, TIMELINE_HISTORY_DAYS);
  return [today, ...history];
}

/** 返回包含结束日在内、向前 29 天的发现列表统计闭区间。 */
export function getTimelineRange(end: string): HouseRecordDateRange {
  const startAtNoon = new Date(`${end}T12:00:00+08:00`);
  startAtNoon.setUTCDate(startAtNoon.getUTCDate() - (RECENT_UPDATE_DAYS - 1));

  return {
    start: getShanghaiDate(startAtNoon),
    end,
  };
}
