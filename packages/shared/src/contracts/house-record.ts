import type {
  HouseModuleId,
  PublishedSpaceRecord,
  RentalTrustEvidence,
  RentalTrustLabel
} from './rental-space';

/** 公开快照的生成来源，为后续随机任务和系统迁移预留稳定枚举。 */
export type RentalSnapshotSource = 'MANUAL_UPDATE' | 'RANDOM_TASK' | 'SYSTEM';

/** 公开页面允许展示的房主身份摘要，不包含 openid 等内部标识。 */
export interface HouseRecordAuthor {
  nickname: string;
  avatar: string;
}

/** 发现页单张房屋实录卡片的数据。 */
export interface HouseRecordListing {
  rentalId: string;
  title: string;
  contentPreview: string;
  coverPhoto?: string;
  author: HouseRecordAuthor;
  trustLabels: RentalTrustLabel[];
  recentUpdateCount: number;
  latestSnapshotDate: string;
  updatedAt: string;
}

/** 最近 30 天时间线中的一个真实更新日期。 */
export interface HouseRecordTimelineNode {
  snapshotDate: string;
  source: RentalSnapshotSource;
  updatedModules: HouseModuleId[];
  contentPreview?: string;
  coverPhoto?: string;
  isLatest: boolean;
}

/** 成长树页面一次加载所需的作者信息、日期范围和节点。 */
export interface HouseRecordTimelineResponse {
  rentalId: string;
  title: string;
  author: HouseRecordAuthor;
  trustLabels: RentalTrustLabel[];
  rangeStart: string;
  rangeEnd: string;
  nodes: HouseRecordTimelineNode[];
}

/** 指定自然日的公开房屋空间快照。 */
export interface HouseRecordSnapshotResponse {
  rentalId: string;
  snapshotDate: string;
  source: RentalSnapshotSource;
  records: PublishedSpaceRecord[];
  trustEvidence: RentalTrustEvidence;
}

/** 房主页面判断是否需要主动更新公开实录的状态。 */
export interface HouseRecordSnapshotStatus {
  latestSnapshotDate?: string;
  currentUpdatedAt: string;
  hasUnpublishedChanges: boolean;
}
