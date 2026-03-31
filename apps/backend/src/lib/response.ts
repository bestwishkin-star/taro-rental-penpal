import { NextResponse } from 'next/server';

import type { ApiResponse } from '@shared/contracts/api';
import type { BizCodeValue } from '@shared/errors';
import { BizCode, BizMessage } from '@shared/errors';

import { AppError } from './errors';

export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    code: BizCode.OK,
    message: BizMessage[BizCode.OK],
    data
  });
}

export function fail(bizCode: BizCodeValue, message?: string): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      code: bizCode,
      message: message ?? BizMessage[bizCode],
      data: null
    },
    { status: 200 }
  );
}

export function handleError(error: unknown): NextResponse<ApiResponse<null>> {
  if (error instanceof AppError) {
    return fail(error.bizCode, error.message);
  }
  const message = error instanceof Error ? error.message : '系统错误';
  return fail(BizCode.UNKNOWN, message);
}
