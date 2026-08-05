import { handleError, ok } from '@/lib/response';
import { readRentalCheckinSummary } from '@/modules/rentals/rental-checkin.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 获取故事公开的连续居住汇总，不返回打卡照片。 */
export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await readRentalCheckinSummary(id));
  } catch (error) {
    return handleError(error);
  }
}
