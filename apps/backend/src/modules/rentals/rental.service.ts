import type {
  CreateRentalCommentInput,
  CreateRentalInput,
  CreateRentalReportInput,
  HandleRentalReportInput,
  ListRentalsQuery,
  RentalStatus,
  UpdateRentalSupplementInput
} from '@shared/contracts/rental';

import {
  createRental,
  createRentalComment,
  createRentalProofs,
  createRentalReport,
  deleteRentalComment,
  getFavoriteStatus,
  getRentalById,
  getRentalReportById,
  handleRentalReport,
  listFavorites,
  listMyRentals,
  listRentalComments,
  listRentalReports,
  listRentals,
  toggleFavorite,
  updateRentalStatus,
  updateRentalSupplement
} from './rental.repository';

/** 读取公开的租房经历列表。 */
export async function readRentals(query: ListRentalsQuery = {}) {
  return listRentals(query);
}

/** 读取单条租房经历详情。 */
export async function readRental(id: string) {
  return getRentalById(id);
}

/** 发布租房经历，并保存可选真实性凭证。 */
export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  const result = await createRental(userOpenid, input);
  await createRentalProofs(userOpenid, result.id, input.proofPhotos);
  return result;
}

/** 读取当前用户发布过的租房经历。 */
export async function readMyRentals(userOpenid: string) {
  return listMyRentals(userOpenid);
}

/** 读取当前用户收藏的租房经历。 */
export async function readFavorites(userOpenid: string) {
  return listFavorites(userOpenid);
}

/** 读取当前用户对某条租房经历的收藏状态。 */
export async function readFavoriteStatus(userOpenid: string, rentalId: string) {
  return getFavoriteStatus(userOpenid, rentalId);
}

/** 切换收藏状态。 */
export async function switchFavorite(userOpenid: string, rentalId: string) {
  return toggleFavorite(userOpenid, rentalId);
}

/** 更新当前用户自己发布内容的上下架状态。 */
export async function changeRentalStatus(id: string, openid: string, status: RentalStatus) {
  return updateRentalStatus(id, openid, status === 'active' ? 1 : 0);
}

/** 读取租房经历的公开评论。 */
export async function readRentalComments(rentalId: string) {
  return listRentalComments(rentalId);
}

/** 发布租房经历评论。 */
export async function publishRentalComment(userOpenid: string, rentalId: string, input: CreateRentalCommentInput) {
  return createRentalComment(userOpenid, rentalId, input.content.trim());
}

/** 删除当前用户自己的评论。 */
export async function removeRentalComment(userOpenid: string, commentId: string) {
  return deleteRentalComment(userOpenid, commentId);
}

/** 提交租房专项举报。 */
export async function reportRental(userOpenid: string, rentalId: string, input: CreateRentalReportInput) {
  return createRentalReport(userOpenid, rentalId, input);
}

/** 读取后台举报队列。 */
export async function readRentalReports() {
  return listRentalReports();
}

/** 读取后台举报详情。 */
export async function readRentalReport(id: string) {
  return getRentalReportById(id);
}

/** 处理租房经历举报并更新内容状态。 */
export async function resolveRentalReport(reportId: string, adminOpenid: string, input: HandleRentalReportInput) {
  return handleRentalReport(reportId, adminOpenid, input);
}

/** 补充当前用户自己发布内容的租房参考信息。 */
export async function supplementRental(id: string, userOpenid: string, input: UpdateRentalSupplementInput) {
  return updateRentalSupplement(id, userOpenid, input);
}
