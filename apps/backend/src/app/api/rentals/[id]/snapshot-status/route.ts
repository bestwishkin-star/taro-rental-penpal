import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readHouseRecordSnapshotStatus } from '@/modules/house-records/house-record.service';

/** Next.js 15 动态路由参数。 */
interface SnapshotStatusRouteContext {
  params: Promise<{ id: string }>;
}

/** 从请求头读取并验证当前房主身份。 */
async function readOwnerOpenid(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return null;
  return (await verifyToken(token))?.openid ?? null;
}

/** 返回房主当前态相对最后公开快照的更新状态。 */
export async function GET(request: Request, context: SnapshotStatusRouteContext) {
  try {
    const openid = await readOwnerOpenid(request);
    if (!openid) return fail(BizCode.UNAUTHORIZED);
    const { id } = await context.params;
    return ok(await readHouseRecordSnapshotStatus(openid, id));
  } catch (error) {
    return handleError(error);
  }
}
