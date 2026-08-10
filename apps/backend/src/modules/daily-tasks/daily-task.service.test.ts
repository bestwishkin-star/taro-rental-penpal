import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pool } from '@/lib/mysql';

import {
  appendSnapshotActivity,
  findDailyTaskBySlot,
  findObservationByIdempotencyKeyWithConnection,
  findObservationByTaskIdWithConnection,
  getActivitySummary,
  getLatestSnapshotDate,
  getOwnedRentalState,
  insertDailyTask,
  insertImmutableObservation,
  listRecentTaskHistory,
  lockDailyTask,
  markTaskCompleted,
  markTaskStarted,
  type DailyTaskRecord
} from './daily-task.repository';
import { projectObservation, readOwnerSpaceFacts } from './daily-task-projection.service';
import { selectDailyTaskTemplate } from './daily-task.selector';
import {
  completeDailyTask,
  getOrCreateTodayTask,
  readDailyTaskActivity,
  startDailyTask
} from './daily-task.service';
import { replaceSnapshotFromPublicFactsWithConnection } from './daily-task-snapshot.service';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import type { RentalTaskObservation } from './daily-task.types';

vi.mock('@/lib/mysql', () => ({ pool: { getConnection: vi.fn() } }));

vi.mock('./daily-task.repository', () => ({
  appendSnapshotActivity: vi.fn(),
  findDailyTaskBySlot: vi.fn(),
  findObservationByIdempotencyKeyWithConnection: vi.fn(),
  findObservationByTaskIdWithConnection: vi.fn(),
  getActivitySummary: vi.fn(),
  getLatestSnapshotDate: vi.fn(),
  getOwnedRentalState: vi.fn(),
  insertDailyTask: vi.fn(),
  insertImmutableObservation: vi.fn(),
  listRecentTaskHistory: vi.fn(),
  lockDailyTask: vi.fn(),
  markTaskCompleted: vi.fn(),
  markTaskStarted: vi.fn()
}));

vi.mock('./daily-task.selector', () => ({ selectDailyTaskTemplate: vi.fn() }));
vi.mock('./daily-task-events', () => ({ recordDailyTaskEvent: vi.fn() }));
vi.mock('./daily-task-projection.service', () => ({
  projectObservation: vi.fn(),
  readOwnerSpaceFacts: vi.fn()
}));
vi.mock('./daily-task-snapshot.service', () => ({
  replaceSnapshotFromPublicFactsWithConnection: vi.fn()
}));

/** 测试统一使用的固定版本任务模板。 */
const template = DAILY_TASK_TEMPLATES[0]!;

/** Service 测试复用的未开始任务记录。 */
const task: DailyTaskRecord = {
  id: 'task-1',
  rentalId: 'rental-1',
  ownerOpenid: 'owner-1',
  taskDate: '2026-08-10',
  slot: 0,
  templateId: template.id,
  templateVersion: template.version,
  status: 'ASSIGNED',
  assignmentReason: '厨房通风信息需要更新',
  weightSnapshot: [],
  expiresAt: '2026-08-10T16:00:00.000Z',
  publicProjectionStatus: 'NOT_REQUESTED',
  template
};

/** 完成事务测试使用的已开始任务。 */
const startedTask: DailyTaskRecord = {
  ...task,
  status: 'STARTED',
  startedAt: '2026-08-10T06:00:00.000Z'
};

/** 完成事务测试复用的不可变观察。 */
const observation: RentalTaskObservation = {
  id: 'observation-1',
  taskId: 'task-1',
  rentalId: 'rental-1',
  ownerOpenid: 'owner-1',
  module: 'kitchen',
  taskDate: '2026-08-10',
  idempotencyKey: 'request-key-0001',
  answers: { odor_after_two_minutes: 'clear' },
  measurementValues: {},
  photoAssetIds: [],
  conclusionVisibility: 'PRIVATE',
  photoVisibility: 'PRIVATE',
  integrityStatus: 'PASSED',
  safetyStatus: 'UNCHECKED',
  householdStatus: 'UNCHECKED',
  publicProjectionStatus: 'NOT_REQUESTED',
  observedAt: '2026-08-10T08:00:00.000Z'
};

/** 构造包含事务方法的连接替身。 */
function createConnection() {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn()
  };
}

/** 完成事务测试复用的合法客户端输入。 */
const completionInput = {
  idempotencyKey: 'request-key-0001',
  answers: { odor_after_two_minutes: 'clear' },
  measurementValues: {},
  photoAssetIds: [],
  conclusionVisibility: 'PRIVATE' as const,
  photoVisibility: 'PRIVATE' as const,
  observedAt: '2026-08-10T08:00:00.000Z'
};

/** 为今日任务测试补齐无观察的活跃度响应。 */
function mockEmptyActivity(): void {
  vi.mocked(getActivitySummary).mockResolvedValue({
    rangeStart: '2026-07-12',
    rangeEnd: '2026-08-10',
    activeDays: 0,
    publicDays: 0,
    privateDays: 0,
    moduleFreshness: {}
  });
  vi.mocked(getLatestSnapshotDate).mockResolvedValue(undefined);
}

describe('daily-task.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOwnedRentalState).mockResolvedValue('PUBLISHED');
    vi.mocked(listRecentTaskHistory).mockResolvedValue([]);
    vi.mocked(selectDailyTaskTemplate).mockReturnValue({
      template,
      assignmentReason: '按数据新鲜度选出',
      candidates: []
    });
    mockEmptyActivity();
    const connection = createConnection();
    vi.mocked(pool.getConnection).mockResolvedValue(connection as never);
    vi.mocked(lockDailyTask).mockResolvedValue(startedTask);
    vi.mocked(findObservationByIdempotencyKeyWithConnection).mockResolvedValue(null);
    vi.mocked(findObservationByTaskIdWithConnection).mockResolvedValue(null);
    vi.mocked(insertImmutableObservation).mockResolvedValue(observation);
    vi.mocked(projectObservation).mockResolvedValue({
      ownerFactKeys: ['kitchen.ventilation'],
      publicFactKeys: [],
      publicProjectionStatus: 'NOT_REQUESTED'
    });
    vi.mocked(replaceSnapshotFromPublicFactsWithConnection).mockResolvedValue({
      snapshotId: 'snapshot-1'
    });
    vi.mocked(appendSnapshotActivity).mockResolvedValue(undefined);
    vi.mocked(markTaskCompleted).mockResolvedValue(true);
    vi.mocked(readOwnerSpaceFacts).mockResolvedValue([
      { module: 'kitchen', freshnessPercent: 100, facts: [] }
    ]);
  });

  it('同日并发唯一冲突后回读相同房屋的 slot 0 任务', async () => {
    vi.mocked(findDailyTaskBySlot)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(task);
    vi.mocked(insertDailyTask).mockRejectedValue({ code: 'ER_DUP_ENTRY', errno: 1062 });

    await expect(
      getOrCreateTodayTask('owner-1', 'rental-1', new Date('2026-08-10T08:00:00.000Z'))
    ).resolves.toMatchObject({
      task: { id: 'task-1', rentalId: 'rental-1' },
      completedToday: false
    });
    expect(findDailyTaskBySlot).toHaveBeenLastCalledWith('rental-1', '2026-08-10', 0);
  });

  it('非唯一索引异常保持原错误', async () => {
    const databaseError = new Error('connection lost');
    vi.mocked(findDailyTaskBySlot).mockResolvedValue(null);
    vi.mocked(insertDailyTask).mockRejectedValue(databaseError);

    await expect(
      getOrCreateTodayTask('owner-1', 'rental-1', new Date('2026-08-10T08:00:00.000Z'))
    ).rejects.toBe(databaseError);
  });

  it('拒绝在上海自然日过期后开始旧任务', async () => {
    vi.mocked(markTaskStarted).mockResolvedValue({
      ...task,
      status: 'ASSIGNED',
      expiresAt: '2026-08-09T16:00:00.000Z'
    });

    await expect(
      startDailyTask('owner-1', 'rental-1', 'task-1', new Date('2026-08-10T00:00:00.000Z'))
    ).rejects.toMatchObject({ bizCode: 1311 });
  });

  it('重复开始任务时返回首次记录的开始时间', async () => {
    vi.mocked(markTaskStarted).mockResolvedValue({
      ...task,
      status: 'STARTED',
      startedAt: '2026-08-10T08:00:00.000Z'
    });

    await expect(
      startDailyTask('owner-1', 'rental-1', 'task-1', new Date('2026-08-10T08:05:00.000Z'))
    ).resolves.toMatchObject({
      id: 'task-1',
      status: 'STARTED',
      startedAt: '2026-08-10T08:00:00.000Z'
    });
  });

  it('活动窗口按上海日期包含当天向前计算', async () => {
    vi.mocked(getActivitySummary).mockResolvedValue({
      rangeStart: '2026-08-04',
      rangeEnd: '2026-08-10',
      activeDays: 3,
      publicDays: 2,
      privateDays: 1,
      moduleFreshness: { bedroom: '2026-08-10' }
    });

    await readDailyTaskActivity(
      'owner-1',
      'rental-1',
      7,
      new Date('2026-08-09T16:30:00.000Z')
    );

    expect(getActivitySummary).toHaveBeenCalledWith('rental-1', '2026-08-04', '2026-08-10');
  });

  it('重复幂等键返回第一次完成结果且不新增观察', async () => {
    vi.mocked(findObservationByIdempotencyKeyWithConnection).mockResolvedValue(observation);

    await expect(
      completeDailyTask(
        'owner-1',
        'rental-1',
        'task-1',
        completionInput,
        new Date('2026-08-10T08:00:00.000Z')
      )
    ).resolves.toMatchObject({ taskId: 'task-1', freshnessPercent: 100 });
    expect(insertImmutableObservation).not.toHaveBeenCalled();
  });

  it('快照写入失败时回滚观察事实和任务状态', async () => {
    const connection = createConnection();
    vi.mocked(pool.getConnection).mockResolvedValue(connection as never);
    vi.mocked(replaceSnapshotFromPublicFactsWithConnection).mockRejectedValue(
      new Error('snapshot failed')
    );

    await expect(
      completeDailyTask(
        'owner-1',
        'rental-1',
        'task-1',
        completionInput,
        new Date('2026-08-10T08:00:00.000Z')
      )
    ).rejects.toThrow('snapshot failed');
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(markTaskCompleted).not.toHaveBeenCalled();
  });

  it('定时观察未达到模板最短时长时拒绝完成', async () => {
    vi.mocked(lockDailyTask).mockResolvedValue({
      ...startedTask,
      startedAt: '2026-08-10T07:59:00.000Z'
    });

    await expect(
      completeDailyTask(
        'owner-1',
        'rental-1',
        'task-1',
        completionInput,
        new Date('2026-08-10T08:00:00.000Z')
      )
    ).rejects.toMatchObject({ bizCode: 1314 });
    expect(insertImmutableObservation).not.toHaveBeenCalled();
  });
});
