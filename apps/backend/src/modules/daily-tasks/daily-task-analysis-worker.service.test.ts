import { describe, expect, it, vi } from 'vitest';

import { runPendingPhotoAnalysisJobs } from '@/modules/photo-analysis/photo-analysis.service';

import { runPhotoAnalysisWithTaskProjection } from './daily-task-analysis-worker.service';
import { refreshAllPendingTaskProjections } from './daily-task-review.service';

vi.mock('@/modules/photo-analysis/photo-analysis.service', () => ({
  runPendingPhotoAnalysisJobs: vi.fn()
}));
vi.mock('./daily-task-review.service', () => ({
  refreshAllPendingTaskProjections: vi.fn()
}));

describe('daily-task-analysis-worker.service', () => {
  it('图片分析批次结束后补偿回填待审核任务观察', async () => {
    vi.mocked(runPendingPhotoAnalysisJobs).mockResolvedValue({ processed: 2 });
    vi.mocked(refreshAllPendingTaskProjections).mockResolvedValue({
      processed: 1,
      published: 1,
      rejected: 0,
      failed: 0
    });

    await expect(runPhotoAnalysisWithTaskProjection()).resolves.toEqual({
      processed: 2,
      taskProjections: {
        processed: 1,
        published: 1,
        rejected: 0,
        failed: 0
      }
    });
    expect(refreshAllPendingTaskProjections).toHaveBeenCalledOnce();
  });
});
