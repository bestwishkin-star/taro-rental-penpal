import type {
  CreateRentalCommentInput,
  CreateRentalInput,
  CreateRentalReportInput,
  HandleRentalReportInput,
  ListRentalsQuery,
  RentalStatus
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
  updateRentalStatus
} from './rental.repository';

export async function readRentals(query: ListRentalsQuery = {}) {
  return listRentals(query);
}

export async function readRental(id: string) {
  return getRentalById(id);
}

export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  const result = await createRental(userOpenid, input);
  await createRentalProofs(userOpenid, result.id, input.proofPhotos);
  return result;
}

export async function readMyRentals(userOpenid: string) {
  return listMyRentals(userOpenid);
}

export async function readFavorites(userOpenid: string) {
  return listFavorites(userOpenid);
}

export async function readFavoriteStatus(userOpenid: string, rentalId: string) {
  return getFavoriteStatus(userOpenid, rentalId);
}

export async function switchFavorite(userOpenid: string, rentalId: string) {
  return toggleFavorite(userOpenid, rentalId);
}

export async function changeRentalStatus(id: string, openid: string, status: RentalStatus) {
  return updateRentalStatus(id, openid, status === 'active' ? 1 : 0);
}

export async function readRentalComments(rentalId: string) {
  return listRentalComments(rentalId);
}

export async function publishRentalComment(userOpenid: string, rentalId: string, input: CreateRentalCommentInput) {
  return createRentalComment(userOpenid, rentalId, input.content.trim());
}

export async function removeRentalComment(userOpenid: string, commentId: string) {
  return deleteRentalComment(userOpenid, commentId);
}

export async function reportRental(userOpenid: string, rentalId: string, input: CreateRentalReportInput) {
  return createRentalReport(userOpenid, rentalId, input);
}

export async function readRentalReports() {
  return listRentalReports();
}

export async function readRentalReport(id: string) {
  return getRentalReportById(id);
}

export async function resolveRentalReport(reportId: string, adminOpenid: string, input: HandleRentalReportInput) {
  return handleRentalReport(reportId, adminOpenid, input);
}
