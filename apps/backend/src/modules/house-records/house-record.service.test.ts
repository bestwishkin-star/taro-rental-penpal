import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isHouseRecordOwner,
  listTimelineActivities
} from './house-record-activity.repository';
import { publishCurrentHouseRecord } from './house-record-snapshot.service';
import {
  countRecentSnapshots,
  getBatchTrustLabels,
  getOwnerHouseRecordState,
  getOwnerSnapshotStatus,
  getPublicHouseRecordSummary,
  getPublicSnapshotHeader,
  getRentalTrustEvidence,
  listLatestPublicSnapshots,
  listSnapshotPhotos,
  listSnapshotSpaces,
  listTimelineModules,
  listTimelineSnapshots
} from './house-record.repository';
import {
  readHouseRecordSnapshot,
  readHouseRecordSnapshotStatus,
  readHouseRecordTimeline,
  readHouseRecords,
  updateOwnedHouseRecord
} from './house-record.service';

vi.mock('./house-record-activity.repository', () => ({
  isHouseRecordOwner: vi.fn(),
  listTimelineActivities: vi.fn()
}));

vi.mock('./house-record.repository', () => ({
  countRecentSnapshots: vi.fn(),
  getBatchTrustLabels: vi.fn(),
  getOwnerHouseRecordState: vi.fn(),
  getOwnerSnapshotStatus: vi.fn(),
  getPublicHouseRecordSummary: vi.fn(),
  getPublicSnapshotHeader: vi.fn(),
  getRentalTrustEvidence: vi.fn(),
  listLatestPublicSnapshots: vi.fn(),
  listSnapshotPhotos: vi.fn(),
  listSnapshotSpaces: vi.fn(),
  listTimelineModules: vi.fn(),
  listTimelineSnapshots: vi.fn()
}));

vi.mock('./house-record-snapshot.service', () => ({
  publishCurrentHouseRecord: vi.fn()
}));

/** 房屋实录公开读取与房主更新的服务层行为测试。 */
describe('house-record.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTimelineActivities).mockResolvedValue([]);
    vi.mocked(isHouseRecordOwner).mockResolvedValue(false);
  });

  it('一次批量查询补齐发现列表的近 30 天更新次数和可信标签', async () => {
    vi.mocked(listLatestPublicSnapshots).mockResolvedValue([
      {
        rentalId: 'rental-1',
        title: '窗边的日常',
        contentPreview: '午后的客厅很安静',
        coverPhoto: 'https://example.com/living.jpg',
        nickname: '阿禾',
        avatar: 'https://example.com/avatar.jpg',
        latestSnapshotDate: '2026-08-06',
        updatedAt: '2026-08-06T08:00:00.000Z'
      }
    ]);
    vi.mocked(countRecentSnapshots).mockResolvedValue(new Map([['rental-1', 4]]));
    vi.mocked(getBatchTrustLabels).mockResolvedValue(
      new Map([['rental-1', ['SPACE_RECORD_COMPLETE', 'CONTINUOUS_RESIDENCY']]])
    );

    const result = await readHouseRecords(
      { keyword: '客厅', page: '1', pageSize: '10' },
      new Date('2026-08-06T08:00:00.000Z')
    );

    expect(result).toEqual([
      {
        rentalId: 'rental-1',
        title: '窗边的日常',
        contentPreview: '午后的客厅很安静',
        coverPhoto: 'https://example.com/living.jpg',
        author: { nickname: '阿禾', avatar: 'https://example.com/avatar.jpg' },
        trustLabels: ['SPACE_RECORD_COMPLETE', 'CONTINUOUS_RESIDENCY'],
        recentUpdateCount: 4,
        latestSnapshotDate: '2026-08-06',
        updatedAt: '2026-08-06T08:00:00.000Z'
      }
    ]);
    expect(countRecentSnapshots).toHaveBeenCalledTimes(1);
    expect(getBatchTrustLabels).toHaveBeenCalledTimes(1);
  });

  it('时间线只返回今天和有真实快照的历史日期', async () => {
    vi.mocked(getPublicHouseRecordSummary).mockResolvedValue({
      rentalId: 'rental-1',
      title: '窗边的日常',
      nickname: '阿禾',
      avatar: ''
    });
    vi.mocked(listTimelineSnapshots).mockResolvedValue([
      {
        snapshotId: 'snapshot-2',
        snapshotDate: '2026-08-06',
        source: 'MANUAL_UPDATE',
        contentPreview: '今天重新整理了厨房',
        coverPhoto: undefined
      },
      {
        snapshotId: 'snapshot-1',
        snapshotDate: '2026-08-02',
        source: 'SYSTEM',
        contentPreview: undefined,
        coverPhoto: undefined
      }
    ]);
    vi.mocked(listTimelineModules).mockResolvedValue(
      new Map([
        ['snapshot-2', ['kitchen', 'living']],
        ['snapshot-1', ['kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood']]
      ])
    );
    vi.mocked(getBatchTrustLabels).mockResolvedValue(
      new Map([['rental-1', ['SPACE_RECORD_COMPLETE']]])
    );

    const result = await readHouseRecordTimeline('rental-1', new Date('2026-08-06T08:00:00.000Z'));

    expect(result.nodes.filter((node) => node.hasRecord).map((node) => node.snapshotDate))
      .toEqual(['2026-08-06', '2026-08-02']);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0]).toMatchObject({ isToday: true, hasRecord: true });
    expect(result.nodes[1]).toMatchObject({
      snapshotDate: '2026-08-02', hasRecord: true, isToday: false, activityState: 'PUBLIC_UPDATE'
    });
    expect(result.nodes[0]?.isLatest).toBe(true);
    expect(result.rangeStart).toBe('2026-08-02');
    expect(result.rangeEnd).toBe('2026-08-06');
  });

  it('没有历史快照时只保留今天的未上报入口', async () => {
    vi.mocked(getPublicHouseRecordSummary).mockResolvedValue({
      rentalId: 'rental-1', title: '窗边的日常', nickname: '阿禾', avatar: ''
    });
    vi.mocked(listTimelineSnapshots).mockResolvedValue([]);
    vi.mocked(listTimelineModules).mockResolvedValue(new Map());
    vi.mocked(getBatchTrustLabels).mockResolvedValue(new Map());
    vi.mocked(isHouseRecordOwner).mockResolvedValue(true);

    const result = await readHouseRecordTimeline(
      'rental-1', new Date('2026-11-16T16:01:00Z'), 'owner-1'
    );

    expect(result.isOwner).toBe(true);
    expect(result.nodes).toHaveLength(1);
    expect(new Set(result.nodes.map((node) => node.snapshotDate)).size).toBe(1);
    expect(result.nodes[0]).toMatchObject({
      snapshotDate: '2026-11-17', isToday: true, hasRecord: false, activityState: 'NOT_REPORTED'
    });
    expect(result.nodes.every((node) => !node.hasRecord && !node.isLatest && !node.source)).toBe(true);
    expect(result.nodes.filter((node) => node.isToday)).toHaveLength(1);
    expect(listTimelineSnapshots).toHaveBeenCalledWith('rental-1', '2026-11-17');
    expect(result.rangeStart).toBe('2026-11-17');
  });

  it('最新快照不是今天时仍保留今天的未上报入口', async () => {
    vi.mocked(getPublicHouseRecordSummary).mockResolvedValue({
      rentalId: 'rental-1', title: '窗边的日常', nickname: '阿禾', avatar: ''
    });
    vi.mocked(listTimelineSnapshots).mockResolvedValue([{
      snapshotId: 'snapshot-1', snapshotDate: '2026-09-02', source: 'MANUAL_UPDATE',
      contentPreview: undefined, coverPhoto: undefined
    }]);
    vi.mocked(listTimelineModules).mockResolvedValue(new Map());
    vi.mocked(getBatchTrustLabels).mockResolvedValue(new Map());

    const result = await readHouseRecordTimeline('rental-1', new Date('2026-11-17T04:00:00Z'));

    expect(result.isOwner).toBe(false);
    expect(result.nodes[0]).toMatchObject({ isToday: true, hasRecord: false, isLatest: false });
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[1]).toMatchObject({ snapshotDate: '2026-09-02', isToday: false, hasRecord: true, isLatest: true });
    expect(result.rangeStart).toBe('2026-09-02');
  });

  it('私密活动只暴露匿名节点状态', async () => {
    vi.mocked(getPublicHouseRecordSummary).mockResolvedValue({
      rentalId: 'rental-1',
      title: '窗边的日常',
      nickname: '阿禾',
      avatar: ''
    });
    vi.mocked(listTimelineSnapshots).mockResolvedValue([
      {
        snapshotId: 'snapshot-1',
        snapshotDate: '2026-08-10',
        source: 'RANDOM_TASK',
        contentPreview: '此前公开内容',
        coverPhoto: 'https://example.com/public.jpg'
      }
    ]);
    vi.mocked(listTimelineModules).mockResolvedValue(
      new Map([['snapshot-1', ['kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood']]])
    );
    vi.mocked(listTimelineActivities).mockResolvedValue([
      {
        snapshotDate: '2026-08-10',
        source: 'RANDOM_TASK',
        visibility: 'PRIVATE',
        module: 'bedroom',
        projectionStatus: 'NOT_REQUESTED'
      }
    ]);
    vi.mocked(getBatchTrustLabels).mockResolvedValue(new Map([['rental-1', []]]));

    const result = await readHouseRecordTimeline(
      'rental-1',
      new Date('2026-08-10T08:00:00.000Z')
    );

    expect(result.nodes[0]).toMatchObject({
      activityState: 'PRIVATE_ACTIVITY',
      hasRecord: true,
      updatedModules: [],
      hasPrivateActivity: true
    });
    expect(result.nodes[0]).not.toHaveProperty('privateChangeCount');
    expect(result.nodes[0]).not.toHaveProperty('contentPreview');
    expect(result.nodes[0]).not.toHaveProperty('coverPhoto');
  });

  it('审核拒绝状态只向房主展示', async () => {
    vi.mocked(getPublicHouseRecordSummary).mockResolvedValue({
      rentalId: 'rental-1',
      title: '窗边的日常',
      nickname: '阿禾',
      avatar: ''
    });
    vi.mocked(listTimelineSnapshots).mockResolvedValue([
      {
        snapshotId: 'snapshot-1',
        snapshotDate: '2026-08-10',
        source: 'RANDOM_TASK',
        contentPreview: undefined,
        coverPhoto: undefined
      }
    ]);
    vi.mocked(listTimelineModules).mockResolvedValue(new Map([['snapshot-1', ['kitchen']]]));
    vi.mocked(listTimelineActivities).mockResolvedValue([
      {
        snapshotDate: '2026-08-10',
        source: 'RANDOM_TASK',
        visibility: 'PUBLIC',
        module: 'kitchen',
        projectionStatus: 'REJECTED'
      }
    ]);
    vi.mocked(getBatchTrustLabels).mockResolvedValue(new Map([['rental-1', []]]));

    const publicResult = await readHouseRecordTimeline(
      'rental-1',
      new Date('2026-08-10T08:00:00.000Z')
    );
    vi.mocked(isHouseRecordOwner).mockResolvedValue(true);
    const ownerResult = await readHouseRecordTimeline(
      'rental-1',
      new Date('2026-08-10T08:00:00.000Z'),
      'owner-1'
    );

    expect(publicResult.nodes[0]?.activityState).toBe('PRIVATE_ACTIVITY');
    expect(ownerResult.nodes[0]?.activityState).toBe('REVIEW_REJECTED_OWNER_ONLY');
    expect(ownerResult.nodes[0]?.updatedModules).toEqual([]);
  });

  it('指定日期详情仅使用快照空间和快照照片构造公开记录', async () => {
    vi.mocked(getPublicSnapshotHeader).mockResolvedValue({
      snapshotId: 'snapshot-1',
      rentalId: 'rental-1',
      snapshotDate: '2026-08-06',
      source: 'MANUAL_UPDATE'
    });
    vi.mocked(listSnapshotSpaces).mockResolvedValue([
      {
        snapshotSpaceId: 'space-1',
        module: 'kitchen',
        sceneAnswers: [{ promptId: 'kitchen-light', value: 'bright' }],
        observations: [{ label: '采光', value: '明亮' }],
        eventText: '晚饭时厨房的操作台够用。',
        eventVoiceUrl: undefined,
        eventOccurredPeriod: 'EVENING'
      }
    ]);
    vi.mocked(listSnapshotPhotos).mockResolvedValue(
      new Map([['space-1', ['https://example.com/kitchen.jpg']]])
    );
    vi.mocked(getRentalTrustEvidence).mockResolvedValue({
      labels: ['SPACE_RECORD_COMPLETE'],
      hasVerificationOnlyPhotos: false
    });

    const result = await readHouseRecordSnapshot('rental-1', '2026-08-06');

    expect(result.records).toEqual([
      {
        module: 'kitchen',
        publicPhotos: ['https://example.com/kitchen.jpg'],
        sceneAnswers: [{ promptId: 'kitchen-light', value: 'bright' }],
        observations: [{ label: '采光', value: '明亮' }],
        eventText: '晚饭时厨房的操作台够用。',
        eventOccurredPeriod: 'EVENING'
      }
    ]);
    expect(result).not.toHaveProperty('ownerOpenid');
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('proofPhotos');
  });

  it('指定日期没有公开快照时返回稳定业务错误', async () => {
    vi.mocked(getPublicSnapshotHeader).mockResolvedValue(null);

    await expect(readHouseRecordSnapshot('rental-1', '2026-08-01')).rejects.toMatchObject({
      bizCode: 1304
    });
  });

  it('当前草稿晚于最后快照时标记存在未公开修改', async () => {
    vi.mocked(getOwnerHouseRecordState).mockResolvedValue({
      ownerOpenid: 'owner-1',
      isPublished: true
    });
    vi.mocked(getOwnerSnapshotStatus).mockResolvedValue({
      currentUpdatedAt: '2026-08-06T09:00:00.000Z',
      latestSnapshotDate: '2026-08-06',
      latestSnapshotUpdatedAt: '2026-08-06T08:00:00.000Z'
    });

    await expect(readHouseRecordSnapshotStatus('owner-1', 'rental-1')).resolves.toEqual({
      currentUpdatedAt: '2026-08-06T09:00:00.000Z',
      latestSnapshotDate: '2026-08-06',
      hasUnpublishedChanges: true
    });
  });

  it('房屋未公开时拒绝房主生成当天快照', async () => {
    vi.mocked(getOwnerHouseRecordState).mockResolvedValue({
      ownerOpenid: 'owner-1',
      isPublished: false
    });

    await expect(updateOwnedHouseRecord('owner-1', 'rental-1')).rejects.toMatchObject({
      bizCode: 1302
    });
    expect(publishCurrentHouseRecord).not.toHaveBeenCalled();
  });
});
