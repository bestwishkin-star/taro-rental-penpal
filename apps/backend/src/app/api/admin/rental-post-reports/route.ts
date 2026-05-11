import { handleError, ok } from '@/lib/response';
import { readRentalReports } from '@/modules/rentals/rental.service';

/** 后台读取租房经历举报列表。 */
export async function GET() {
  try {
    return ok(await readRentalReports());
  } catch (error) {
    return handleError(error);
  }
}
