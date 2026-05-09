const defaultApiBaseUrl = 'http://127.0.0.1:3000/api';
const placeholderApiBaseUrl = 'https://api.example.com/api';

function resolveApiBaseUrl() {
  const configuredApiBaseUrl = process.env.TARO_APP_API_BASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  // 开发构建不允许落到生产占位域名，避免本地调试请求 https://api.example.com。
  if (!isProduction && configuredApiBaseUrl === placeholderApiBaseUrl) {
    return defaultApiBaseUrl;
  }

  return configuredApiBaseUrl ?? defaultApiBaseUrl;
}

export const frontendEnv = {
  apiBaseUrl: resolveApiBaseUrl()
};
