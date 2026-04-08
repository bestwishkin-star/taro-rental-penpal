
import type { ApiResponse } from '@shared/contracts/api';
import { BizCode } from '@shared/errors';
import Taro from '@tarojs/taro';

import { frontendEnv } from '@/shared/config/env';

const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return Taro.getStorageSync(TOKEN_KEY) || null;
}

export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token);
}

export function removeToken() {
  Taro.removeStorageSync(TOKEN_KEY);
}

export class BizError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message);
    this.name = 'BizError';
  }
}

interface RequestOptions<TBody> {
  body?: TBody;
  params?: Record<string, string | undefined>;
  method?: 'GET' | 'POST';
}

export async function uploadFile<TData>(path: string, filePath: string): Promise<TData> {
  const header: Record<string, string> = {};
  const token = getToken();
  if (token) {
    header['authorization'] = `Bearer ${token}`;
  }

  const response = await Taro.uploadFile({
    url: `${frontendEnv.apiBaseUrl}${path}`,
    filePath,
    name: 'file',
    header
  });

  if (response.statusCode >= 400) {
    throw new BizError(BizCode.UNKNOWN, `上传失败 [${response.statusCode}]`);
  }

  const result = JSON.parse(response.data) as ApiResponse<TData>;

  if (result.code !== BizCode.OK) {
    throw new BizError(result.code, result.message);
  }

  return result.data as TData;
}

export async function httpRequest<TData, TBody = undefined>(
  path: string,
  options: RequestOptions<TBody> = {}
): Promise<TData> {
  const { body, params, method = 'GET' } = options;
  const header: Record<string, string> = {
    'content-type': 'application/json'
  };

  const token = getToken();
  if (token) {
    header['authorization'] = `Bearer ${token}`;
  }

  const response = await Taro.request<ApiResponse<TData>>({
    url: `${frontendEnv.apiBaseUrl}${path}`,
    method,
    data:
      method === 'GET'
        ? params
          ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
          : undefined
        : body,
    header
  });

  if (response.statusCode >= 400 || !response.data) {
    throw new BizError(BizCode.UNKNOWN, `网络请求失败 [${response.statusCode}]`);
  }

  const { code, message, data } = response.data;

  if (code !== BizCode.OK) {
    throw new BizError(code, message);
  }

  return data as TData;
}
