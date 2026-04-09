import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readMyRentals } from '@/modules/rentals/rental.service';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const rentals = await readMyRentals(payload.openid);
    return ok(rentals);
  } catch (error) {
    return handleError(error);
  }
}
