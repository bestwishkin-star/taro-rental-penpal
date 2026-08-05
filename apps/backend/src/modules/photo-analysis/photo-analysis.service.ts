import type { PhotoAnalysisType } from '@shared/contracts/rental-space';

import { configuredPhotoAnalyzers } from './photo-analysis.config';
import {
  claimPhotoAnalysisJobs,
  completePhotoAnalysisJob,
  createPhotoAnalysisJob,
  failPhotoAnalysisJob,
  listHouseholdReferenceAssetIds
} from './photo-analysis.repository';

/** 按当前注册的厂商创建分析任务；未配置厂商时不会创建虚假任务。 */
export async function queueConfiguredPhotoAnalysis(
  photoAssetId: string,
  types: PhotoAnalysisType[] = ['SAFETY'],
  referenceScope?: string
): Promise<PhotoAnalysisType[]> {
  const typeSet = new Set(types);
  const analyzers = configuredPhotoAnalyzers.filter((analyzer) => typeSet.has(analyzer.type));
  await Promise.all(
    analyzers.map((analyzer) =>
      createPhotoAnalysisJob({
        photoAssetId,
        analysisType: analyzer.type,
        provider: analyzer.provider,
        modelVersion: analyzer.modelVersion,
        policyVersion: analyzer.policyVersion,
        referenceScope
      })
    )
  );
  return analyzers.map((analyzer) => analyzer.type);
}

/** 消费待处理任务，并把厂商输出映射为平台统一状态。 */
export async function runPendingPhotoAnalysisJobs(limit = 5): Promise<{ processed: number }> {
  const analyzers = new Map(
    configuredPhotoAnalyzers.map((analyzer) => [`${analyzer.type}:${analyzer.provider}:${analyzer.modelVersion}`, analyzer])
  );
  const jobs = await claimPhotoAnalysisJobs(limit);
  for (const job of jobs) {
    const analyzer = analyzers.get(`${job.analysis_type}:${job.provider}:${job.model_version}`);
    if (!analyzer) {
      await failPhotoAnalysisJob(job);
      continue;
    }
    try {
      // 家庭一致性任务需要同一草稿内的其他照片作为对照，安全审核不需要参考集。
      const referenceAssetIds =
        job.analysis_type === 'HOUSEHOLD_CONSISTENCY' && job.reference_scope
          ? await listHouseholdReferenceAssetIds(job.reference_scope, job.photo_asset_id)
          : undefined;
      const result = await analyzer.analyze({
        assetId: job.photo_asset_id,
        fileUrl: job.file_url,
        mimeType: job.mime_type,
        referenceAssetIds
      });
      await completePhotoAnalysisJob(job, result);
    } catch {
      await failPhotoAnalysisJob(job);
    }
  }
  return { processed: jobs.length };
}
