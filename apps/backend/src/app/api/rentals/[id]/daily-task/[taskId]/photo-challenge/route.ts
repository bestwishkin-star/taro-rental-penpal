import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { issueDailyTaskPhotoChallenge } from '@/modules/daily-tasks/daily-task.service';

/** 照片挑战路由的动态路径参数。 */
interface RouteContext {
  params: Promise<{ id: string; taskId: string }>;
}

/** 从请求头读取并验证当前登录用户。 */
async function authenticate(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  return token ? verifyToken(token) : null;
}

/** 为仍有效的照片任务签发一次短时现场拍摄挑战。 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const payload = await authenticate(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id: rentalId, taskId } = await context.params;
    if (!rentalId || !taskId) return fail(BizCode.INVALID_PARAMS);

    return ok(await issueDailyTaskPhotoChallenge(payload.openid, rentalId, taskId));
  } catch (error) {
    return handleError(error);
  }
}
