import type { CreateRentalCheckinInput, RentalEventPeriod } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { publishRentalCheckin } from '@/modules/rentals/rental-checkin.service';
import { isEvidenceVisibility } from '@/modules/rentals/rental-draft.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 收敛外部时段输入，禁止任意字符串进入打卡数据。 */
function isPeriod(value: unknown): value is RentalEventPeriod {
  return value === 'MORNING' || value === 'DAYTIME' || value === 'EVENING' || value === 'LATE_NIGHT';
}

/** 为本人已发布故事新增一次居住微打卡。 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.assetId !== 'string' || !body.assetId.trim()) {
      return fail(BizCode.INVALID_PARAMS, '缺少打卡照片');
    }
    if (!isEvidenceVisibility(body.visibility) || !isPeriod(body.period)) {
      return fail(BizCode.INVALID_PARAMS, '打卡照片可见性或时段不正确');
    }
    if (typeof body.note !== 'string' || body.note.trim().length < 5 || body.note.trim().length > 500) {
      return fail(BizCode.INVALID_PARAMS, '请用 5-500 个字记录此刻的居住体验');
    }
    if (typeof body.capturedAt !== 'string') return fail(BizCode.INVALID_PARAMS, '缺少拍摄时间');

    const { id } = await context.params;
    const input: CreateRentalCheckinInput = {
      assetId: body.assetId.trim(),
      visibility: body.visibility,
      period: body.period,
      note: body.note.trim(),
      capturedAt: body.capturedAt
    };
    return ok(await publishRentalCheckin(id, payload.openid, input));
  } catch (error) {
    return handleError(error);
  }
}
