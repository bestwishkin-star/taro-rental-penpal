import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readCurrentRentalDraft } from '@/modules/rentals/rental-draft.service';

/** 只读获取当前用户未发布草稿，不存在时返回 null。 */
export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    return ok(await readCurrentRentalDraft(payload.openid));
  } catch (error) {
    return handleError(error);
  }
}
