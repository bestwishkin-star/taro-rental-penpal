import type { RentalSnapshotSource } from '@shared/contracts/house-record';
import type {
  HouseModuleId,
  RentalEventPeriod,
  SpaceSceneAnswer,
} from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

/** 服务端计算最近时间线时使用的闭区间。 */
export interface HouseRecordDateRange {
  start: string;
  end: string;
}

/** 公开快照主表的数据库行。 */
export interface RentalPublicSnapshotRow extends RowDataPacket {
  id: string;
  rental_id: string;
  owner_openid: string;
  snapshot_date: Date | string;
  source: RentalSnapshotSource;
  title: string | null;
  content_preview: string | null;
  cover_photo_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/** 某天快照内单个空间切片的数据库行。 */
export interface RentalPublicSnapshotSpaceRow extends RowDataPacket {
  id: string;
  snapshot_id: string;
  module_type: HouseModuleId;
  prompt_version: string;
  scene_answers: SpaceSceneAnswer[] | string | null;
  observations: Array<{ label: string; value: string }> | string | null;
  event_text: string | null;
  event_voice_url: string | null;
  event_occurred_period: RentalEventPeriod | null;
  created_at: Date | string;
}

/** 快照空间中的公开照片行。 */
export interface RentalPublicSnapshotPhotoRow extends RowDataPacket {
  id: string;
  snapshot_space_id: string;
  photo_asset_id: string;
  file_url: string;
  sort_order: number;
  created_at: Date | string;
}

/** 写入快照事务的公开照片输入。 */
export interface SnapshotWritePhoto {
  photoAssetId: string;
  fileUrl: string;
  sortOrder: number;
}

/** 写入快照事务的单个空间输入。 */
export interface SnapshotWriteSpace {
  module: HouseModuleId;
  promptVersion: string;
  sceneAnswers: SpaceSceneAnswer[];
  observations: Array<{ label: string; value: string }>;
  eventText: string | null;
  eventVoiceUrl: string | null;
  eventOccurredPeriod: RentalEventPeriod | null;
  photos: SnapshotWritePhoto[];
}

/** 同日覆盖事务所需的完整公开快照输入。 */
export interface SnapshotWriteInput {
  rentalId: string;
  ownerOpenid: string;
  snapshotDate: string;
  source: RentalSnapshotSource;
  title: string | null;
  contentPreview: string | null;
  coverPhotoUrl: string | null;
  records: SnapshotWriteSpace[];
}
