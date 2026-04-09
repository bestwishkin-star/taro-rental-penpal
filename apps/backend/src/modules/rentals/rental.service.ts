import type { CreateRentalInput, ListRentalsQuery } from '@shared/contracts/rental';

import {
  createRental,
  getFavoriteStatus,
  getRentalById,
  listFavorites,
  listMyRentals,
  listRentals,
  toggleFavorite
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
