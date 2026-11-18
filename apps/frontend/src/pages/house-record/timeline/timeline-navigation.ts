import type { HouseRecordTimelineNode, HouseRecordTimelineResponse } from '@shared/contracts/house-record';

/** 节点点击结果：进入上报或快照页面，未开放的日期给出说明。 */
type TimelineNavigation = { url: string } | { message: string };

/** 未上报日期不请求快照，仅房主的今天节点可以进入每日观察。 */
export function resolveTimelineNavigation(
  timeline: Pick<HouseRecordTimelineResponse, 'rentalId' | 'isOwner'>,
  node: Pick<HouseRecordTimelineNode, 'snapshotDate' | 'activityState' | 'hasRecord' | 'isToday'>
): TimelineNavigation {
  const rentalId = encodeURIComponent(timeline.rentalId);
  if (!node.hasRecord) {
    if (!node.isToday) return { message: '这一天没有上报记录' };
    if (!timeline.isOwner) return { message: '仅记录者可以上报今天的记录' };
    return { url: '/pages/daily-task/index?rentalId=' + rentalId };
  }
  return {
    url: '/pages/house-record/model/index?rentalId=' + rentalId +
      '&snapshotDate=' + node.snapshotDate + '&activityState=' + node.activityState
  };
}
