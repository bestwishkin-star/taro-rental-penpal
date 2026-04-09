import type { UpdateRentalStatusInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { changeRentalStatus } from '@/modules/rentals/rental.service';

async function auth(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await auth(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const body = (await request.json()) as UpdateRentalStatusInput;

    if (body.status !== 'active' && body.status !== 'inactive') {
      return fail(BizCode.INVALID_PARAMS);
    }

    const updated = await changeRentalStatus(id, payload.openid, body.status);
    if (!updated) return fail(BizCode.RENTAL_NOT_FOUND);

    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
