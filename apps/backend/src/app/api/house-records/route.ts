import type { ListRentalsQuery } from '@shared/contracts/rental';

import { handleError, ok } from '@/lib/response';
import { readHouseRecords } from '@/modules/house-records/house-record.service';

/** 返回公开房屋实录发现列表。 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query: ListRentalsQuery = {
      keyword: searchParams.get('keyword') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined
    };
    return ok(await readHouseRecords(query));
  } catch (error) {
    return handleError(error);
  }
}
