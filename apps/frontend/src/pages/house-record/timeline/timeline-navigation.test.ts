import type { HouseRecordTimelineNode } from '@shared/contracts/house-record';
import { describe, expect, it } from 'vitest';

import { resolveTimelineNavigation } from './timeline-navigation';

const today: HouseRecordTimelineNode = {
  snapshotDate: '2026-11-17', hasRecord: false, isToday: true,
  activityState: 'NOT_REPORTED', updatedModules: [], hasPrivateActivity: false, isLatest: false
};

/** 上报入口和只读快照不能混用，也不能替其他房主上报。 */
describe('resolveTimelineNavigation', () => {
  it('房主点击今天未上报的花进入每日观察', () => {
    expect(resolveTimelineNavigation({ rentalId: 'rental-1', isOwner: true }, today)).toEqual({
      url: '/pages/daily-task/index?rentalId=rental-1'
    });
  });

  it('浏览其他房屋时不能进入上报', () => {
    expect(resolveTimelineNavigation({ rentalId: 'rental-1', isOwner: false }, today)).toEqual({
      message: '仅记录者可以上报今天的记录'
    });
  });

  it('过去未上报的花不请求不存在的快照，也不进入今天的任务', () => {
    expect(resolveTimelineNavigation({ rentalId: 'rental-1', isOwner: true }, {
      ...today, snapshotDate: '2026-11-16', isToday: false
    })).toEqual({ message: '这一天没有上报记录' });
  });

  it.each(['PUBLIC_UPDATE', 'PRIVATE_ACTIVITY', 'REVIEW_PENDING', 'REVIEW_REJECTED_OWNER_ONLY'] as const)(
    '已上报的 %s 果子打开正确日期快照', (activityState) => {
      expect(resolveTimelineNavigation({ rentalId: 'rental-1', isOwner: true }, {
        ...today, hasRecord: true, activityState, snapshotDate: '2026-11-16', isToday: false
      })).toEqual({
        url: '/pages/house-record/model/index?rentalId=rental-1&snapshotDate=2026-11-16&activityState=' + activityState
      });
    }
  );
});
