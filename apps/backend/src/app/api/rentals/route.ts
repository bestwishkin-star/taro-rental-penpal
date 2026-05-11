import type { CreateRentalInput, ListRentalsQuery } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { buildRentalLocationLabel } from '@/modules/rentals/location-utils';
import { publishRental, readRentals } from '@/modules/rentals/rental.service';

/** 读取租房经历列表，支持关键词、区域、租金和类型筛选。 */
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
    return ok(await readRentals(query));
  } catch (error) {
    return handleError(error);
  }
}

/** 首次发布只要求真实经历，租房参考允许后续补充。 */
export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as CreateRentalInput;
    const experience = body.experience?.trim();
    const hasPhoto = Array.isArray(body.photos) && body.photos.length > 0;
    if (!experience) return fail(BizCode.INVALID_PARAMS, '请填写真实租房经历');
    if (!hasPhoto) return fail(BizCode.INVALID_PARAMS, '请至少上传 1 张图片');
    if (!body.truthPledge) return fail(BizCode.INVALID_PARAMS, '请确认内容来自真实租房经历');

    const location =
      body.location?.trim() ||
      buildRentalLocationLabel({
        province: body.province,
        city: body.city,
        district: body.district,
        address: body.landmark || body.address
      }) ||
      '待补充';

    const result = await publishRental(payload.openid, {
      ...body,
      title: body.title?.trim() || experience.slice(0, 28),
      experience,
      location
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
