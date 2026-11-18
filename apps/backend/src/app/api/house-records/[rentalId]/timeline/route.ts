import { verifyToken } from '@/lib/jwt';
import { handleError, ok } from '@/lib/response';
import { readHouseRecordTimeline } from '@/modules/house-records/house-record.service';

/** Next.js 15 动态路由参数。 */
interface TimelineRouteContext {
  params: Promise<{ rentalId: string }>;
}

/** 返回指定房屋今天及最近 14 个有记录的历史日期节点，并按可选房主身份保护拒绝状态。 */
export async function GET(request: Request, context: TimelineRouteContext) {
  try {
    const { rentalId } = await context.params;
    const authorization = request.headers.get('authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    const viewer = token ? await verifyToken(token) : null;
    return ok(await readHouseRecordTimeline(rentalId, new Date(), viewer?.openid));
  } catch (error) {
    return handleError(error);
  }
}
