import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadFrontendEnv() {
  vi.resetModules();
  return (await import('./env')).frontendEnv;
}

describe('frontendEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the local backend when dev receives the production placeholder API host', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TARO_APP_API_BASE_URL', 'https://api.example.com/api');

    await expect(loadFrontendEnv()).resolves.toMatchObject({
      apiBaseUrl: 'http://127.0.0.1:3000/api'
    });
  });
});
