import type { LoginRequest, LoginResponse } from '@shared/contracts/auth';
import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { loginWithCode } from '@/modules/auth/auth.service';

/** 登录接口：校验小程序 code 后换取后端 token。 */
export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequest;

  if (!body.code) {
    return fail(BizCode.INVALID_PARAMS, 'code is required');
  }

  try {
    const result = await loginWithCode(body.code);
    return ok<LoginResponse>(result);
  } catch (error) {
    return handleError(error);
  }
}
