import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { readHouseRecordSnapshot } from '@/modules/house-records/house-record.service';

/** 公开快照路由仅接受无时区歧义的自然日。 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Next.js 15 双动态路由参数。 */
interface SnapshotRouteContext {
  params: Promise<{ rentalId: string; date: string }>;
}

/** 返回指定自然日固化的公开房屋快照。 */
export async function GET(_request: Request, context: SnapshotRouteContext) {
  try {
    const { rentalId, date } = await context.params;
    if (!DATE_PATTERN.test(date)) return fail(BizCode.INVALID_PARAMS, '日期格式不正确');
    return ok(await readHouseRecordSnapshot(rentalId, date));
  } catch (error) {
    return handleError(error);
  }
}
