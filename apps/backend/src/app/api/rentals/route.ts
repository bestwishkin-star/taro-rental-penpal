import type { CreateRentalInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { findUserByToken } from '@/modules/auth/auth.repository';
import { publishRental, readRentals } from '@/modules/rentals/rental.service';

function extractToken(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET() {
  try {
    const rentals = await readRentals();
    return ok(rentals);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const user = await findUserByToken(token);
    if (!user) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as CreateRentalInput;

    if (!body.price) return fail(BizCode.INVALID_PARAMS, '请填写月租价格');
    if (!body.location) return fail(BizCode.INVALID_PARAMS, '请填写所在位置');
    if (!body.roomType) return fail(BizCode.INVALID_PARAMS, '请选择租住类型');
    if (!body.experience) return fail(BizCode.INVALID_PARAMS, '请填写居住感受');

    const result = await publishRental(user.openid, body);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
