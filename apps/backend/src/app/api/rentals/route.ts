import type { CreateRentalInput, ListRentalsQuery } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { buildRentalLocationLabel } from '@/modules/rentals/location-utils';
import { publishRental, readRentals } from '@/modules/rentals/rental.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query: ListRentalsQuery = {
      keyword: searchParams.get('keyword') ?? undefined,
      filter: searchParams.get('filter') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      priceRange: (searchParams.get('priceRange') as ListRentalsQuery['priceRange']) ?? undefined,
      province: searchParams.get('province') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      district: searchParams.get('district') ?? undefined
    };
    const rentals = await readRentals(query);
    return ok(rentals);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as CreateRentalInput;
    const hasCompleteRegion = Boolean(body.province && body.city && body.district);

    if (!body.price) return fail(BizCode.INVALID_PARAMS, '请填写租金');
    if (!body.roomType) return fail(BizCode.INVALID_PARAMS, '请选择租房类型');
    if (!body.experience) return fail(BizCode.INVALID_PARAMS, '请填写房源描述');
    if (!hasCompleteRegion) return fail(BizCode.INVALID_PARAMS, '请选择省市区');

    const location =
      body.location?.trim() ||
      buildRentalLocationLabel({
        province: body.province,
        city: body.city,
        district: body.district,
        address: body.address
      });
    if (!location) return fail(BizCode.INVALID_PARAMS, '请选择省市区');

    const result = await publishRental(payload.openid, {
      ...body,
      location
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
