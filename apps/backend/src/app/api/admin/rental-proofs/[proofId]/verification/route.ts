import type { VerifyRentalProofInput } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { isConfiguredAdmin } from '@/lib/admin';
import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { verifyRentalProof } from '@/modules/rentals/rental-proof-verification.service';

interface RouteContext {
  params: Promise<{ proofId: string }>;
}

/** 仅允许白名单管理员更新私密居住凭证的核验状态。 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    if (!isConfiguredAdmin(payload.openid)) return fail(BizCode.FORBIDDEN);

    const body = (await request.json()) as Record<string, unknown>;
    if (body.status !== 'VERIFIED' && body.status !== 'REJECTED') {
      return fail(BizCode.INVALID_PARAMS, '核验状态不正确');
    }
    const { proofId } = await context.params;
    await verifyRentalProof(proofId, payload.openid, { status: body.status } as VerifyRentalProofInput);
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
