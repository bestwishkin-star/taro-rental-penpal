import { BizCode } from '@shared/errors';

import { runPhotoAnalysisWithTaskProjection } from '@/modules/daily-tasks/daily-task-analysis-worker.service';
import { fail, handleError, ok } from '@/lib/response';

/** 由受保护的内部 worker 调用，消费图片分析并回填每日任务公开投影。 */
export async function POST(request: Request) {
  try {
    const workerSecret = process.env.PHOTO_ANALYSIS_WORKER_SECRET;
    if (!workerSecret || request.headers.get('x-worker-secret') !== workerSecret) {
      return fail(BizCode.FORBIDDEN);
    }
    return ok(await runPhotoAnalysisWithTaskProjection());
  } catch (error) {
    return handleError(error);
  }
}
