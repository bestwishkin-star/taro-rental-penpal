import type { CreateRentalCommentInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { publishRentalComment, readRentalComments } from '@/modules/rentals/rental.service';

/** 读取租房经历公开评论。 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await readRentalComments(id));
  } catch (error) {
    return handleError(error);
  }
}

/** 发布租房经历评论。 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const body = (await request.json()) as CreateRentalCommentInput;
    const content = body.content?.trim();
    if (!content) return fail(BizCode.INVALID_PARAMS, '请填写评论内容');
    if (content.length > 300) return fail(BizCode.INVALID_PARAMS, '评论不能超过 300 字');

    return ok(await publishRentalComment(payload.openid, id, { content }));
  } catch (error) {
    return handleError(error);
  }
}
