import type { CreateRentalInput, ListRentalsQuery } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { publishRental, readRentals } from '@/modules/rentals/rental.service';

const EXPERIENCE_REQUIRED_MESSAGE = '\u8bf7\u586b\u5199\u771f\u5b9e\u5c45\u4f4f\u6545\u4e8b';
const PHOTO_REQUIRED_MESSAGE = '\u8bf7\u81f3\u5c11\u4e0a\u4f20 1 \u5f20\u56fe\u7247';
const PLEDGE_REQUIRED_MESSAGE = '\u8bf7\u786e\u8ba4\u5185\u5bb9\u6765\u81ea\u771f\u5b9e\u5c45\u4f4f\u4f53\u9a8c';

function normalizePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query: ListRentalsQuery = {
      keyword: searchParams.get('keyword') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined
    };
    return ok(await readRentals(query));
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
    const experience = body.experience?.trim();
    const photos = normalizePhotos(body.photos);
    const proofPhotos = normalizePhotos(body.proofPhotos);
    if (!experience) return fail(BizCode.INVALID_PARAMS, EXPERIENCE_REQUIRED_MESSAGE);
    if (photos.length === 0) return fail(BizCode.INVALID_PARAMS, PHOTO_REQUIRED_MESSAGE);
    if (!body.truthPledge) return fail(BizCode.INVALID_PARAMS, PLEDGE_REQUIRED_MESSAGE);

    const result = await publishRental(payload.openid, {
      title: body.title?.trim() || experience.slice(0, 28),
      experience,
      photos,
      proofPhotos,
      truthPledge: body.truthPledge,
      wechat: body.wechat?.trim()
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
