import { verifyToken } from '@/lib/jwt';
import { handleError, ok } from '@/lib/response';
import { readHouseRecordTimeline } from '@/modules/house-records/house-record.service';

/** Next.js 15 动态路由参数。 */
interface TimelineRouteContext {
  params: Promise<{ rentalId: string }>;
}

/** 返回指定房屋最近 30 天真实存在的更新节点，并按可选房主身份保护拒绝状态。 */
export async function GET(request: Request, context: TimelineRouteContext) {
  try {
    const { rentalId } = await context.params;
    const { searchParams } = new URL(request.url);
    const parsedDays = Number.parseInt(searchParams.get('days') ?? '30', 10);
    const days = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(parsedDays, 30) : 30;
    const authorization = request.headers.get('authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    const viewer = token ? await verifyToken(token) : null;
    return ok(await readHouseRecordTimeline(rentalId, days, new Date(), viewer?.openid));
  } catch (error) {
    return handleError(error);
  }
}
