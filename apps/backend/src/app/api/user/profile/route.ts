import type { UserProfileInput } from '@shared/contracts/user';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readUserProfile, updateUserProfile } from '@/modules/users/user.service';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const profile = await readUserProfile(payload.openid);
    return ok(profile);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as UserProfileInput;
    const profile = await updateUserProfile(payload.openid, body);
    return ok(profile);
  } catch (error) {
    return handleError(error);
  }
}
