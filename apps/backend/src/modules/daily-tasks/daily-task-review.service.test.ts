import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pool } from '@/lib/mysql';

import {
  inspectObservationPhotoReview,
  listPendingObservationIds,
  listPendingObservationIdsByPhotoAsset,
  lockPendingTaskProjection,
  promotePublicFactHeads,
  updateTaskProjectionReviewStatus
} from './daily-task.repository';
import { refreshPendingTaskProjections } from './daily-task-review.service';
import { replaceSnapshotFromPublicFactsWithConnection } from './daily-task-snapshot.service';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import type { RentalTaskObservation } from './daily-task.types';

vi.mock('@/lib/mysql', () => ({ pool: { getConnection: vi.fn() } }));
vi.mock('./daily-task-events', () => ({ recordDailyTaskEvent: vi.fn() }));
vi.mock('./daily-task-schema', () => ({ ensureDailyTaskSchema: vi.fn() }));
vi.mock('./daily-task.repository', () => ({
  inspectObservationPhotoReview: vi.fn(),
  listPendingObservationIds: vi.fn(),
  listPendingObservationIdsByPhotoAsset: vi.fn(),
  lockPendingTaskProjection: vi.fn(),
  promotePublicFactHeads: vi.fn(),
  updateTaskProjectionReviewStatus: vi.fn()
}));
vi.mock('./daily-task-snapshot.service', () => ({
  replaceSnapshotFromPublicFactsWithConnection: vi.fn()
}));

/** 审核回填测试使用的照片任务模板。 */
const template = DAILY_TASK_TEMPLATES.find((item) => item.id === 'kitchen-worktop-photo')!;

/** 审核回填测试复用的等待公开观察。 */
const observation: RentalTaskObservation = {
  id: 'observation-1',
  taskId: 'task-1',
  rentalId: 'rental-1',
  ownerOpenid: 'owner-1',
  module: 'kitchen',
  taskDate: '2026-08-10',
  idempotencyKey: 'request-key-0001',
  answers: { worktop_state: 'enough' },
  measurementValues: {},
  photoAssetIds: ['photo-1'],
  conclusionVisibility: 'PUBLIC',
  photoVisibility: 'PRIVATE',
  integrityStatus: 'PASSED',
  safetyStatus: 'PENDING',
  householdStatus: 'PENDING',
  publicProjectionStatus: 'PENDING',
  observedAt: '2026-08-10T08:00:00.000Z'
};

/** 构造审核事务连接替身。 */
function createConnection() {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn()
  };
}

describe('daily-task-review.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listPendingObservationIdsByPhotoAsset).mockResolvedValue(['observation-1']);
    vi.mocked(listPendingObservationIds).mockResolvedValue(['observation-1']);
    vi.mocked(lockPendingTaskProjection).mockResolvedValue({
      observation,
      templateId: template.id,
      templateVersion: template.version
    });
    vi.mocked(promotePublicFactHeads).mockResolvedValue(['kitchen.worktop-layout']);
    vi.mocked(updateTaskProjectionReviewStatus).mockResolvedValue(undefined);
    vi.mocked(replaceSnapshotFromPublicFactsWithConnection).mockResolvedValue({
      snapshotId: 'snapshot-1'
    });
    vi.mocked(pool.getConnection).mockResolvedValue(createConnection() as never);
  });

  it('照片审核通过后推进 public head 并重建原任务日期快照', async () => {
    vi.mocked(inspectObservationPhotoReview).mockResolvedValue({
      allFound: true,
      safetyStatus: 'PASSED',
      householdStatus: 'CONSISTENT'
    });

    await expect(refreshPendingTaskProjections('photo-1')).resolves.toMatchObject({
      processed: 1,
      published: 1,
      rejected: 0
    });
    expect(promotePublicFactHeads).toHaveBeenCalledWith(expect.anything(), 'observation-1');
    expect(replaceSnapshotFromPublicFactsWithConnection).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ snapshotDate: '2026-08-10' })
    );
  });

  it('照片审核拒绝时不推进 public head 且不重建快照', async () => {
    vi.mocked(inspectObservationPhotoReview).mockResolvedValue({
      allFound: true,
      safetyStatus: 'REJECTED',
      householdStatus: 'CONSISTENT'
    });

    await expect(refreshPendingTaskProjections('photo-1')).resolves.toMatchObject({
      processed: 1,
      published: 0,
      rejected: 1
    });
    expect(promotePublicFactHeads).not.toHaveBeenCalled();
    expect(replaceSnapshotFromPublicFactsWithConnection).not.toHaveBeenCalled();
    expect(updateTaskProjectionReviewStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ projectionStatus: 'REJECTED' })
    );
  });
});
