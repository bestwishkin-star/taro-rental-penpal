import { listRentals } from './rental.repository';

export async function readRentals() {
  return listRentals();
}
