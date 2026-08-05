import { HOUSE_MODULE_IDS, type HouseModuleId } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { issueRentalCaptureChallenge } from '@/modules/rentals/rental-draft.service';

interface RouteContext {
  params: Promise<{ id: string; module: string }>;
}

/** 为指定点位签发一次短时有效的随机现场拍摄挑战。 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id, module: rawModule } = await context.params;
    if (!HOUSE_MODULE_IDS.includes(rawModule as HouseModuleId)) {
      return fail(BizCode.INVALID_PARAMS, '未知的空间点位');
    }
    return ok(await issueRentalCaptureChallenge(payload.openid, id, rawModule as HouseModuleId));
  } catch (error) {
    return handleError(error);
  }
}
