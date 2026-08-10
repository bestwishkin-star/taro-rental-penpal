import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findDailyTaskBySlot,
  getActivitySummary,
  getLatestSnapshotDate,
  getOwnedRentalState,
  insertDailyTask,
  listRecentTaskHistory,
  markTaskStarted,
  type DailyTaskRecord
} from './daily-task.repository';
import { selectDailyTaskTemplate } from './daily-task.selector';
import { getOrCreateTodayTask, readDailyTaskActivity, startDailyTask } from './daily-task.service';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';

vi.mock('./daily-task.repository', () => ({
  findDailyTaskBySlot: vi.fn(),
  getActivitySummary: vi.fn(),
  getLatestSnapshotDate: vi.fn(),
  getOwnedRentalState: vi.fn(),
  insertDailyTask: vi.fn(),
  listRecentTaskHistory: vi.fn(),
  markTaskStarted: vi.fn()
}));

vi.mock('./daily-task.selector', () => ({ selectDailyTaskTemplate: vi.fn() }));
vi.mock('./daily-task-events', () => ({ recordDailyTaskEvent: vi.fn() }));

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
});
