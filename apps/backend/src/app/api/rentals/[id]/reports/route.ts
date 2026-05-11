import type { CreateRentalReportInput, RentalReportReason } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { reportRental } from '@/modules/rentals/rental.service';

const REASONS: RentalReportReason[] = [
  'fake_rent_or_address',
  'fake_experience',
  'agent_disguise',
  'phishing',
  'privacy_leak',
  'harassment',
  'other'
];

/** 提交租房专项举报。 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const body = (await request.json()) as CreateRentalReportInput;
    if (!REASONS.includes(body.reason)) return fail(BizCode.INVALID_PARAMS, '请选择举报原因');
    if (!body.description?.trim()) return fail(BizCode.INVALID_PARAMS, '请填写举报说明');

    return ok(await reportRental(payload.openid, id, { ...body, description: body.description.trim() }));
  } catch (error) {
    return handleError(error);
  }
}
