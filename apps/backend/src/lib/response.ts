import { BizCode, BizMessage } from '@shared/errors';
import { NextResponse } from 'next/server';

import { AppError } from './errors';

import type { ApiResponse } from '@shared/contracts/api';

type BizCodeValue = (typeof BizCode)[keyof typeof BizCode];

function json<T>(body: ApiResponse<T>, status = 200): NextResponse<ApiResponse<T>> {
  // 将非 ASCII 字符转为 \uXXXX，避免 WeChat uploadFile 按 Latin-1 解码中文乱码
  const text = JSON.stringify(body).replace(
    /[\u0080-\uffff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
  return new NextResponse(text, {
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
