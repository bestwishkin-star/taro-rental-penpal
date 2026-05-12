export type RentalPostStatus = 'active' | 'pending_review' | 'hidden' | 'rejected';

export type RentalStatus = 'active' | 'inactive';

export type RentalProofStatus = 'none' | 'submitted';

export type RentalReportReason =
  | 'fake_rent_or_address'
  | 'fake_experience'
  | 'agent_disguise'
  | 'phishing'
  | 'privacy_leak'
  | 'harassment'
  | 'other';

export interface ListRentalsQuery {
  keyword?: string;
  page?: string;
  pageSize?: string;
}

export interface RentalListing {
  id: string;
  title: string;
  contentPreview?: string;
  photos: string[];
  status: RentalStatus;
  postStatus?: RentalPostStatus;
  proofStatus?: RentalProofStatus;
  commentCount?: number;
  favoriteCount?: number;
  createdAt?: string;
}

export interface RentalDetail extends RentalListing {
  experience: string;
  wechat: string;
}

export interface CreateRentalInput {
  title?: string;
  experience: string;
  photos: string[];
  proofPhotos?: string[];
  truthPledge: boolean;
  wechat?: string;
}

export interface CreateRentalResponse {
  id: string;
}

export interface FavoriteStatus {
  isFavorited: boolean;
}

export interface UpdateRentalStatusInput {
  status: RentalStatus;
}

export interface RentalComment {
  id: string;
  rentalId: string;
  authorOpenid: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface CreateRentalCommentInput {
  content: string;
}

export interface CreateRentalReportInput {
  reason: RentalReportReason;
  description: string;
  evidencePhotos?: string[];
}

export interface RentalReportListItem {
  id: string;
  rentalId: string;
  rentalTitle: string;
  reporterOpenid: string;
  reason: RentalReportReason;
  status: 'pending' | 'handled';
  createdAt: string;
}

export interface RentalReportDetail extends RentalReportListItem {
  description: string;
  evidencePhotos: string[];
  proofPhotos: string[];
  handledBy?: string;
  handledNote?: string;
  handledAt?: string;
}

export interface HandleRentalReportInput {
  postStatus: RentalPostStatus;
  handledNote: string;
}
