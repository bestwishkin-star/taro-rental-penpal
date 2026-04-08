import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { readRental } from '@/modules/rentals/rental.service';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rental = await readRental(id);
    if (!rental) return fail(BizCode.RENTAL_NOT_FOUND, '房源不存在');
    return ok(rental);
  } catch (error) {
    return handleError(error);
  }
}
