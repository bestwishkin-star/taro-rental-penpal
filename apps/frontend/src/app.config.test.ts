import { describe, expect, it, vi } from 'vitest';

/** 测试读取的最小应用配置类型。 */
interface TestAppConfig {
  requiredPrivateInfos?: string[];
  permission?: Record<string, { desc?: string }>;
  subPackages?: Array<{ root: string; pages: string[] }>;
}

/** 动态加载应用配置并注入 Taro 全局定义函数。 */
async function loadAppConfig(): Promise<TestAppConfig> {
  vi.stubGlobal('defineAppConfig', (config: unknown) => config);
  return (await import('./app.config')).default as TestAppConfig;
}

describe('app config', () => {
  it('does not declare WeChat private location APIs', async () => {
    const config = await loadAppConfig();

    expect(config.requiredPrivateInfos ?? []).not.toContain('getLocation');
    expect(config.requiredPrivateInfos ?? []).not.toContain('chooseLocation');
    expect(config.permission?.['scope.userLocation']).toBeUndefined();
  });

  it('registers the house record subpackage pages', async () => {
    const config = await loadAppConfig();
    const houseRecordPackage = config.subPackages?.find(
      (subpackage) => subpackage.root === 'pages/house-record'
    );

    expect(houseRecordPackage?.pages).toContain('timeline/index');
    expect(houseRecordPackage?.pages).toContain('model/index');
  });
});
