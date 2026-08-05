import { createHash } from 'node:crypto';

import type {
  PhotoAnalysisSummary,
  PhotoAssetUploadResponse,
  PhotoUploadSource
} from '@shared/contracts/rental-space';

import { generateId } from '@/lib/snowflake';

import { createPhotoAsset, getPhotoAnalysisSummary } from './photo-asset.repository';
import { queueConfiguredPhotoAnalysis } from './photo-analysis.service';

/** 图片完成文件落盘后注册资产所需的可信服务端数据。 */
export interface RegisterPhotoAssetInput {
  ownerOpenid: string;
  fileUrl: string;
  mimeType: string;
  buffer: Buffer;
  uploadSource: PhotoUploadSource;
}

/** 计算精确重复哈希、保存图片资产，并按配置创建安全分析任务。 */
export async function registerPhotoAsset(input: RegisterPhotoAssetInput): Promise<PhotoAssetUploadResponse> {
  const assetId = generateId();
  await createPhotoAsset({
    id: assetId,
    ownerOpenid: input.ownerOpenid,
    fileUrl: input.fileUrl,
    mimeType: input.mimeType,
    fileSize: input.buffer.byteLength,
    contentHash: createHash('sha256').update(input.buffer).digest('hex'),
    uploadSource: input.uploadSource
  });
  const queuedTypes = await queueConfiguredPhotoAnalysis(assetId);
  return {
    assetId,
    url: input.fileUrl,
    safetyStatus: queuedTypes.includes('SAFETY') ? 'PENDING' : 'UNCHECKED'
  };
}

/** 读取当前用户拥有图片的分析摘要。 */
export async function readPhotoAnalysis(
  assetId: string,
  ownerOpenid: string
): Promise<PhotoAnalysisSummary | null> {
  return getPhotoAnalysisSummary(assetId, ownerOpenid);
}
