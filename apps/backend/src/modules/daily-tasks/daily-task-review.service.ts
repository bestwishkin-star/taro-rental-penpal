import type { PublicProjectionStatus } from '@shared/contracts/daily-task';
import type { PhotoHouseholdStatus, PhotoSafetyStatus } from '@shared/contracts/rental-space';

import { pool } from '@/lib/mysql';

import { recordDailyTaskEvent } from './daily-task-events';
import {
  inspectObservationPhotoReview,
  listPendingObservationIds,
  listPendingObservationIdsByPhotoAsset,
  lockPendingTaskProjection,
  promotePublicFactHeads,
  updateTaskProjectionReviewStatus
} from './daily-task.repository';
import { replaceSnapshotFromPublicFactsWithConnection } from './daily-task-snapshot.service';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';

/** 一次图片审核回填的处理数量摘要。 */
export interface RefreshTaskProjectionResult {
  processed: number;
  published: number;
  rejected: number;
  failed: number;
}

/** 根据全部照片聚合状态判断公开投影下一状态。 */
function resolveReviewedProjectionStatus(input: {
  allFound: boolean;
  safetyStatus: PhotoSafetyStatus;
  householdStatus: PhotoHouseholdStatus;
}): PublicProjectionStatus {
  if (
    !input.allFound ||
    input.safetyStatus === 'REJECTED' ||
    input.householdStatus === 'SUSPICIOUS'
  ) {
    return 'REJECTED';
  }
  return input.safetyStatus === 'PASSED' && input.householdStatus === 'CONSISTENT'
    ? 'PUBLISHED'
    : 'PENDING';
}

/** 逐条隔离事务回填指定观察，并在通过时重建原任务日期快照。 */
async function refreshObservationIds(
  observationIds: string[]
): Promise<RefreshTaskProjectionResult> {
  const result: RefreshTaskProjectionResult = {
    processed: 0,
    published: 0,
    rejected: 0,
    failed: 0
  };

  for (const observationId of observationIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const review = await lockPendingTaskProjection(connection, observationId);
      if (!review) {
        await connection.commit();
        continue;
      }
      const template = DAILY_TASK_TEMPLATES.find(
        (item) => item.id === review.templateId && item.version === review.templateVersion
      );
      if (!template) throw new Error('异步审核无法读取任务模板版本');

      const photoReview = await inspectObservationPhotoReview(
        connection,
        review.observation.photoAssetIds
      );
      const projectionStatus = resolveReviewedProjectionStatus(photoReview);
      let promotedFactCount = 0;
      if (projectionStatus === 'PUBLISHED') {
        const factKeys = await promotePublicFactHeads(connection, review.observation.id);
        promotedFactCount = factKeys.length;
        await replaceSnapshotFromPublicFactsWithConnection(connection, {
          rentalId: review.observation.rentalId,
          ownerOpenid: review.observation.ownerOpenid,
          snapshotDate: review.observation.taskDate,
          source: 'RANDOM_TASK'
        });
      }
      await updateTaskProjectionReviewStatus(connection, {
        observationId: review.observation.id,
        taskId: review.observation.taskId,
        safetyStatus: photoReview.safetyStatus,
        householdStatus: photoReview.householdStatus,
        projectionStatus
      });
      await connection.commit();

      result.processed += 1;
      if (projectionStatus === 'PUBLISHED') {
        result.published += 1;
        recordDailyTaskEvent('daily_task_projection_published', {
          rentalId: review.observation.rentalId,
          taskId: review.observation.taskId,
          templateId: template.id,
          factCount: promotedFactCount,
          status: projectionStatus
        });
      }
      if (projectionStatus === 'REJECTED') {
        result.rejected += 1;
        recordDailyTaskEvent('daily_task_projection_rejected', {
          rentalId: review.observation.rentalId,
          taskId: review.observation.taskId,
          templateId: template.id,
          status: projectionStatus
        });
      }
    } catch {
      await connection.rollback();
      result.failed += 1;
    } finally {
      connection.release();
    }
  }
  return result;
}

/** 指定图片审核变化后回填所有依赖该图片的观察。 */
export async function refreshPendingTaskProjections(
  photoAssetId: string
): Promise<RefreshTaskProjectionResult> {
  return refreshObservationIds(await listPendingObservationIdsByPhotoAsset(photoAssetId));
}

/** worker 批次结束后补偿扫描仍等待审核的任务观察。 */
export async function refreshAllPendingTaskProjections(): Promise<RefreshTaskProjectionResult> {
  return refreshObservationIds(await listPendingObservationIds());
}
