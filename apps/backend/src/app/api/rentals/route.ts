import type { CreateRentalInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { publishRental, readRentals } from '@/modules/rentals/rental.service';

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
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as CreateRentalInput;

    if (!body.price) return fail(BizCode.INVALID_PARAMS, '请填写月租价格');
    if (!body.location) return fail(BizCode.INVALID_PARAMS, '请填写所在位置');
    if (!body.roomType) return fail(BizCode.INVALID_PARAMS, '请选择租住类型');
    if (!body.experience) return fail(BizCode.INVALID_PARAMS, '请填写居住感受');

    const result = await publishRental(payload.openid, body);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
