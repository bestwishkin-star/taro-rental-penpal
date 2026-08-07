import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { updateOwnedHouseRecord } from '@/modules/house-records/house-record.service';

/** Next.js 15 动态路由参数。 */
interface OwnerSnapshotRouteContext {
  params: Promise<{ id: string }>;
}

/** 从请求头读取并验证当前房主身份。 */
async function readOwnerOpenid(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return null;
  return (await verifyToken(token))?.openid ?? null;
}

/** 生成或覆盖房主当天的公开房屋实录快照。 */
export async function POST(request: Request, context: OwnerSnapshotRouteContext) {
  try {
    const openid = await readOwnerOpenid(request);
    if (!openid) return fail(BizCode.UNAUTHORIZED);
    const { id } = await context.params;
    return ok(await updateOwnedHouseRecord(openid, id));
  } catch (error) {
    return handleError(error);
  }
}
