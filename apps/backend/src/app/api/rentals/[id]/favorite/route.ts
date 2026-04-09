import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readFavoriteStatus, switchFavorite } from '@/modules/rentals/rental.service';

async function auth(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await auth(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    const { id } = await params;
    const status = await readFavoriteStatus(payload.openid, id);
    return ok(status);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await auth(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    const { id } = await params;
    const status = await switchFavorite(payload.openid, id);
    return ok(status);
  } catch (error) {
    return handleError(error);
  }
}
