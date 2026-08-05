import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { publishRentalDraft } from '@/modules/rentals/rental-draft.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 校验六个点位后事务发布草稿，重复调用返回同一故事 ID。 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await context.params;
    return ok(await publishRentalDraft(payload.openid, id));
  } catch (error) {
    return handleError(error);
  }
}
