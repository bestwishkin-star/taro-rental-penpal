import type { CreateRentalInput, ListRentalsQuery } from '@shared/contracts/rental';

import { createRental, getRentalById, listRentals } from './rental.repository';

export async function readRentals(query: ListRentalsQuery = {}) {
  return listRentals(query);
}

export async function readRental(id: string) {
  return getRentalById(id);
}

export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  return createRental(userOpenid, input);
}
