import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readPhotoAnalysis } from '@/modules/photo-analysis/photo-asset.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 查询当前登录用户拥有图片的分析状态。 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await context.params;
    const result = await readPhotoAnalysis(id, payload.openid);
    if (!result) return fail(BizCode.NOT_FOUND, '图片不存在');
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
