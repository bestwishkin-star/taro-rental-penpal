import { runPendingPhotoAnalysisJobs } from '@/modules/photo-analysis/photo-analysis.service';

import { refreshAllPendingTaskProjections } from './daily-task-review.service';

/** 图片分析与每日任务公开投影批次的联合结果。 */
export interface DailyTaskAnalysisWorkerResult {
  processed: number;
  taskProjections: {
    processed: number;
    published: number;
    rejected: number;
    failed: number;
  };
}

/** 先完成图片分析批次，再补偿回填所有仍等待审核的每日任务观察。 */
export async function runPhotoAnalysisWithTaskProjection(): Promise<DailyTaskAnalysisWorkerResult> {
  const analysisResult = await runPendingPhotoAnalysisJobs();
  const taskProjections = await refreshAllPendingTaskProjections();
  return { processed: analysisResult.processed, taskProjections };
}
