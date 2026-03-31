import { NextResponse } from 'next/server';

import type { ApiResponse } from '@shared/contracts/api';
import { BizCode, BizMessage } from '@shared/errors';

import { AppError } from './errors';

type BizCodeValue = (typeof BizCode)[keyof typeof BizCode];

function json<T>(body: ApiResponse<T>, status = 200): NextResponse<ApiResponse<T>> {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return json({ code: BizCode.OK, message: BizMessage[BizCode.OK], data });
}

export function fail(bizCode: BizCodeValue, message?: string): NextResponse<ApiResponse<null>> {
  return json({ code: bizCode, message: message ?? BizMessage[bizCode], data: null });
}

export function handleError(error: unknown): NextResponse<ApiResponse<null>> {
  if (error instanceof AppError) {
    return fail(error.bizCode, error.message);
  }
  const message = error instanceof Error ? error.message : '系统错误';
  return fail(BizCode.UNKNOWN, message);
}
