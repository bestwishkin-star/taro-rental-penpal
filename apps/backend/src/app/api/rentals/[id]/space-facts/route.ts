import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readOwnerSpaceFacts } from '@/modules/daily-tasks/daily-task-projection.service';

/** 房主空间事实路由的动态路径参数。 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 从请求头读取并验证当前登录用户。 */
async function authenticate(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  return token ? verifyToken(token) : null;
}

/** 返回房主可见的六空间当前事实与新鲜度摘要。 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const payload = await authenticate(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id: rentalId } = await context.params;
    if (!rentalId) return fail(BizCode.INVALID_PARAMS);

    return ok(await readOwnerSpaceFacts(payload.openid, rentalId));
  } catch (error) {
    return handleError(error);
  }
}
