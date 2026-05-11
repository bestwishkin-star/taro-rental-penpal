import type { HandleRentalReportInput, RentalPostStatus } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { resolveRentalReport } from '@/modules/rentals/rental.service';

const POST_STATUSES: RentalPostStatus[] = ['active', 'pending_review', 'hidden', 'rejected'];

/** 后台处理租房经历举报，并更新内容状态。 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as HandleRentalReportInput;
    if (!POST_STATUSES.includes(body.postStatus)) return fail(BizCode.INVALID_PARAMS, '请选择处理后的内容状态');
    if (!body.handledNote?.trim()) return fail(BizCode.INVALID_PARAMS, '请填写处理备注');

    const { id } = await params;
    const handled = await resolveRentalReport(id, payload.openid, {
      postStatus: body.postStatus,
      handledNote: body.handledNote.trim()
    });
    if (!handled) return fail(BizCode.NOT_FOUND, '举报不存在');
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
