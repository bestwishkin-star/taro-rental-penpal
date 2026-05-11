import type { UpdateRentalSupplementInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readRental, supplementRental } from '@/modules/rentals/rental.service';

/** 读取单条租房经历详情。 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rental = await readRental(id);
    if (!rental) return fail(BizCode.RENTAL_NOT_FOUND, '租房经历不存在');
    return ok(rental);
  } catch (error) {
    return handleError(error);
  }
}

/** 补充自己发布内容的租房参考信息。 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const body = (await request.json()) as UpdateRentalSupplementInput;
    const updated = await supplementRental(id, payload.openid, body);
    if (!updated) return fail(BizCode.RENTAL_PERMISSION_DENIED, '无权补充这条租房经历');
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
