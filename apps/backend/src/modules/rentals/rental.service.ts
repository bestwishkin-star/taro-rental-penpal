import type { CreateRentalInput } from '@shared/contracts/rental';

import { createRental, listRentals } from './rental.repository';

export async function readRentals() {
  return listRentals();
}

export async function publishRental(userOpenid: string, input: CreateRentalInput) {
  return createRental(userOpenid, input);
}
