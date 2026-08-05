import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { runPendingPhotoAnalysisJobs } from '@/modules/photo-analysis/photo-analysis.service';

/** 由受保护的内部 worker 调用，消费一批异步图片分析任务。 */
export async function POST(request: Request) {
  try {
    const workerSecret = process.env.PHOTO_ANALYSIS_WORKER_SECRET;
    if (!workerSecret || request.headers.get('x-worker-secret') !== workerSecret) {
      return fail(BizCode.FORBIDDEN);
    }
    return ok(await runPendingPhotoAnalysisJobs());
  } catch (error) {
    return handleError(error);
  }
}
