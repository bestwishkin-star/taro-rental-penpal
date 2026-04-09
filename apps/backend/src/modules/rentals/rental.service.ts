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

export async function readRentals(query: ListRentalsQuery = {}) {
  return listRentals(query);
}

export async function readRental(id: string) {
  return getRentalById(id);
}

export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  return createRental(userOpenid, input);
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
