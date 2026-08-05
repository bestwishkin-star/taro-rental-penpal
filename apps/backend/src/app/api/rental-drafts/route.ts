import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { ensureCurrentRentalDraft } from '@/modules/rentals/rental-draft.service';

/** 幂等创建或返回当前用户唯一未发布草稿。 */
export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    return ok(await ensureCurrentRentalDraft(payload.openid));
  } catch (error) {
    return handleError(error);
  }
}
