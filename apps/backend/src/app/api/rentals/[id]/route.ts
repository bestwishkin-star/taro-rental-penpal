import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { readRental } from '@/modules/rentals/rental.service';

const NOT_FOUND_MESSAGE = '\u5c4b\u6a90\u6545\u4e8b\u4e0d\u5b58\u5728';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rental = await readRental(id);
    if (!rental) return fail(BizCode.RENTAL_NOT_FOUND, NOT_FOUND_MESSAGE);
    return ok(rental);
  } catch (error) {
    return handleError(error);
  }
}
