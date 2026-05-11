import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { removeRentalComment } from '@/modules/rentals/rental.service';

/** 删除当前用户自己的评论。 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const removed = await removeRentalComment(payload.openid, id);
    if (!removed) return fail(BizCode.NOT_FOUND, '评论不存在或无权删除');
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
