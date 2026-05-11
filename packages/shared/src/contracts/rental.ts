import type { RentalStructuredLocation } from './location';

/** 租房经历内容状态，支持前台展示和后台治理。 */
export type RentalPostStatus = 'active' | 'pending_review' | 'hidden' | 'rejected';

/** 兼容旧的上下架状态，个人发布列表仍可用。 */
export type RentalStatus = 'active' | 'inactive';

/** 用户分享经历时所处的租住阶段。 */
export type RentalStayStage = 'living' | 'moved_out' | 'viewing' | 'subletting';

/** 租住类型，用于筛选和租房参考信息。 */
export type RentalType = 'whole' | 'shared' | 'single' | 'sublet' | 'short';

/** 发布者是否提交了真实性凭证。 */
export type RentalProofStatus = 'none' | 'submitted';

/** 租房专项举报原因。 */
export type RentalReportReason =
  | 'fake_rent_or_address'
  | 'fake_experience'
  | 'agent_disguise'
  | 'phishing'
  | 'privacy_leak'
  | 'harassment'
  | 'other';

/** 租房经历列表查询条件。 */
export interface ListRentalsQuery {
  keyword?: string;
  filter?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  priceRange?: 'lt2000' | '2000to4000' | 'gt4000';
  province?: string;
  city?: string;
  district?: string;
}

/** 租房经历卡片数据，列表页、收藏页和浏览历史共用。 */
export interface RentalListing {
  id: string;
  title: string;
  contentPreview?: string;
  location: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  price: string;
  area: string;
  roomType: string;
  rentalType?: RentalType;
  stayStage?: RentalStayStage;
  commute?: string;
  tags: string[];
  photos: string[];
  status: RentalStatus;
  postStatus?: RentalPostStatus;
  proofStatus?: RentalProofStatus;
  commentCount?: number;
  favoriteCount?: number;
  createdAt?: string;
}

/** 租房经历详情数据，正文、凭证状态和互动统计在详情页展示。 */
export interface RentalDetail extends RentalListing {
  experience: string;
  wechat: string;
}

/** 发布租房经历的输入。 */
export interface CreateRentalInput extends Partial<RentalStructuredLocation> {
  title: string;
  price?: string;
  location?: string;
  landmark?: string;
  roomType?: string;
  rentalType?: RentalType;
  stayStage?: RentalStayStage;
  area?: string;
  commute?: string;
  experience: string;
  tags: string[];
  photos: string[];
  proofPhotos?: string[];
  truthPledge: boolean;
  wechat?: string;
}

/** 发布成功后返回的新内容 ID。 */
export interface CreateRentalResponse {
  id: string;
}

/** 当前用户对某条租房经历的收藏状态。 */
export interface FavoriteStatus {
  isFavorited: boolean;
}

/** 更新个人发布上下架状态的输入。 */
export interface UpdateRentalStatusInput {
  status: RentalStatus;
}

/** 补充租房参考信息的输入。 */
export interface UpdateRentalSupplementInput extends Partial<RentalStructuredLocation> {
  price?: string;
  location?: string;
  landmark?: string;
  roomType?: string;
  rentalType?: RentalType;
  stayStage?: RentalStayStage;
  area?: string;
  commute?: string;
}

/** 租房经历评论。 */
export interface RentalComment {
  id: string;
  rentalId: string;
  authorOpenid: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

/** 创建评论输入。 */
export interface CreateRentalCommentInput {
  content: string;
}

/** 举报租房经历输入。 */
export interface CreateRentalReportInput {
  reason: RentalReportReason;
  description: string;
  evidencePhotos?: string[];
}

/** 后台举报列表项。 */
export interface RentalReportListItem {
  id: string;
  rentalId: string;
  rentalTitle: string;
  reporterOpenid: string;
  reason: RentalReportReason;
  status: 'pending' | 'handled';
  createdAt: string;
}

/** 后台举报详情。 */
export interface RentalReportDetail extends RentalReportListItem {
  description: string;
  evidencePhotos: string[];
  proofPhotos: string[];
  handledBy?: string;
  handledNote?: string;
  handledAt?: string;
}

/** 后台处理举报输入。 */
export interface HandleRentalReportInput {
  postStatus: RentalPostStatus;
  handledNote: string;
}
