const defaultApiBaseUrl = 'http://127.0.0.1:3000/api';

export const frontendEnv = {
  apiBaseUrl: process.env.TARO_APP_API_BASE_URL ?? defaultApiBaseUrl
};
