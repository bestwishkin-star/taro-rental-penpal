import type { CreateRentalInput, ListRentalsQuery, RentalStatus } from '@shared/contracts/rental';

import {
  createRental,
  getFavoriteStatus,
  getRentalById,
  listFavorites,
  listMyRentals,
  listRentals,
  toggleFavorite,
  updateRentalStatus
} from './rental.repository';

/** 读取公开房源列表，query 由 API 层透传筛选、分页和地区条件。 */
export async function readRentals(query: ListRentalsQuery = {}) {
  return listRentals(query);
}

/** 读取单个已上架房源详情。 */
export async function readRental(id: string) {
  return getRentalById(id);
}

/** 发布房源：把登录用户 openid 和表单输入交给仓储层落库。 */
export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  return createRental(userOpenid, input);
}

/** 读取当前用户发布过的全部房源，包含已下架房源。 */
export async function readMyRentals(userOpenid: string) {
  return listMyRentals(userOpenid);
}

/** 读取当前用户收藏的有效房源。 */
export async function readFavorites(userOpenid: string) {
  return listFavorites(userOpenid);
}

/** 查询当前用户是否已收藏指定房源。 */
export async function readFavoriteStatus(userOpenid: string, rentalId: string) {
  return getFavoriteStatus(userOpenid, rentalId);
}

/** 切换收藏状态：已收藏则取消，未收藏则新增。 */
export async function switchFavorite(userOpenid: string, rentalId: string) {
  return toggleFavorite(userOpenid, rentalId);
}

/** 修改房源上下架状态，仅房源作者可以操作。 */
export async function changeRentalStatus(id: string, openid: string, status: RentalStatus) {
  return updateRentalStatus(id, openid, status === 'active' ? 1 : 0);
}
