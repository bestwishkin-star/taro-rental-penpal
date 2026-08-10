import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readDailyTaskActivity } from '@/modules/daily-tasks/daily-task.service';

/** 活跃度路由的动态路径参数。 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 从请求头读取并验证当前登录用户。 */
async function authenticate(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  return token ? verifyToken(token) : null;
}

/** 解析可选查询窗口，仅接受 1 至 30 天的整数。 */
function parseDays(request: Request): number | null {
  const rawDays = new URL(request.url).searchParams.get('days');
  if (rawDays === null) return 30;
  if (!/^\d+$/.test(rawDays)) return null;

  const days = Number(rawDays);
  return Number.isInteger(days) && days >= 1 && days <= 30 ? days : null;
}

/** 获取房主指定房屋最近一段时间的每日观察活跃度。 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const payload = await authenticate(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id: rentalId } = await context.params;
    const days = parseDays(request);
    if (!rentalId || days === null) return fail(BizCode.INVALID_PARAMS);

    return ok(await readDailyTaskActivity(payload.openid, rentalId, days));
  } catch (error) {
    return handleError(error);
  }
}
