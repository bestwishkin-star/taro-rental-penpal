import type { CreateRentalInput, ListRentalsQuery } from '@shared/contracts/rental';

import { createRental, listRentals } from './rental.repository';

export async function readRentals(query: ListRentalsQuery = {}) {
  return listRentals(query);
}

export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  return createRental(userOpenid, input);
}
