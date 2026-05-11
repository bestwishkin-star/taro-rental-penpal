import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { readRentalReport } from '@/modules/rentals/rental.service';

/** 后台读取单条举报详情。 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const report = await readRentalReport(id);
    if (!report) return fail(BizCode.NOT_FOUND, '举报不存在');
    return ok(report);
  } catch (error) {
    return handleError(error);
  }
}
