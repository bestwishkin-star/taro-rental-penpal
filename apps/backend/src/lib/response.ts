import type { ApiResponse } from '@shared/contracts/api';
import { BizCode, BizMessage } from '@shared/errors';
import { NextResponse } from 'next/server';

import { AppError } from './errors';


// 业务码联合类型，限制 fail 只能返回已定义的业务码。
type BizCodeValue = (typeof BizCode)[keyof typeof BizCode];

/** 统一封装 NextResponse JSON 输出。 */
function json<T>(body: ApiResponse<T>, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(body, { status });
}

/** 成功响应，保持统一 ApiResponse 结构。 */
export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return json({ code: BizCode.OK, message: BizMessage[BizCode.OK], data });
}

/** 失败响应，允许覆盖默认业务错误文案。 */
export function fail(bizCode: BizCodeValue, message?: string): NextResponse<ApiResponse<null>> {
  return json({ code: bizCode, message: message ?? BizMessage[bizCode], data: null });
}

/** 将业务异常和未知异常统一转换成 API 响应。 */
export function handleError(error: unknown): NextResponse<ApiResponse<null>> {
  if (error instanceof AppError) {
    return fail(error.bizCode, error.message);
  }
  const message = error instanceof Error ? error.message : '系统错误';
  return fail(BizCode.UNKNOWN, message);
}
