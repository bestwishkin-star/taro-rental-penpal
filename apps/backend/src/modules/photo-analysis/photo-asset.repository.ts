import type {
  PhotoAnalysisSummary,
  PhotoHouseholdStatus,
  PhotoSafetyStatus,
  PhotoUploadSource
} from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

/** 图片资产数据库行，仅在所有权校验后的内部接口中使用。 */
export interface PhotoAssetRow extends RowDataPacket {
  id: string;
  owner_openid: string;
  file_url: string;
  mime_type: string;
  content_hash: string;
  safety_status: PhotoSafetyStatus;
  household_status: PhotoHouseholdStatus;
  updated_at: Date | string;
}

/** 新图片资产入库所需字段，哈希在 service 层基于原始字节生成。 */
export interface CreatePhotoAssetRecord {
  id: string;
  ownerOpenid: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  contentHash: string;
  uploadSource: PhotoUploadSource;
}

/** 保存统一图片资产；业务照片表只引用资产 ID。 */
export async function createPhotoAsset(input: CreatePhotoAssetRecord): Promise<void> {
  await pool.execute(
    `INSERT INTO photo_assets
      (id, owner_openid, file_url, mime_type, file_size, content_hash, upload_source,
       safety_status, household_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'UNCHECKED', 'UNCHECKED', NOW(), NOW())`,
    [
      input.id,
      input.ownerOpenid,
      input.fileUrl,
      input.mimeType,
      input.fileSize,
      input.contentHash,
      input.uploadSource
    ]
  );
}

/** 按资产 ID 和 openid 双重校验图片所有权。 */
export async function getOwnedPhotoAsset(assetId: string, ownerOpenid: string): Promise<PhotoAssetRow | null> {
  const [rows] = await pool.execute<PhotoAssetRow[]>(
    `SELECT id, owner_openid, file_url, mime_type, content_hash, safety_status, household_status, updated_at
     FROM photo_assets
     WHERE id = ? AND owner_openid = ?`,
    [assetId, ownerOpenid]
  );
  return rows[0] ?? null;
}

/** 仅向图片所有者返回粗粒度审核状态，不返回厂商原始结果。 */
export async function getPhotoAnalysisSummary(
  assetId: string,
  ownerOpenid: string
): Promise<PhotoAnalysisSummary | null> {
  const asset = await getOwnedPhotoAsset(assetId, ownerOpenid);
  if (!asset) return null;
  return {
    assetId: asset.id,
    safetyStatus: asset.safety_status,
    householdStatus: asset.household_status,
    updatedAt: new Date(asset.updated_at).toISOString()
  };
}
