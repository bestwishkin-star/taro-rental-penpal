import path from 'node:path';

import { defineConfig } from '@tarojs/cli';

import themeTokens from '../src/styles/tokens.json';

import devConfig from './dev';
import prodConfig from './prod';

// 生产构建使用独立目录，避免覆盖微信开发者工具读取的开发产物。
const outputRoot = process.env.NODE_ENV === 'production' ? 'dist-prod' : 'dist';

export default defineConfig<'webpack5'>({
  projectName: 'taro-rental-penpal-v2',
  date: '2026-03-03',
  designWidth: 375,
  deviceRatio: {
    375: 2
  },
  sourceRoot: 'src',
  outputRoot,
  framework: 'react',
  // 主题只在 tokens.json 维护；Sass 与原生导航配置共用这份数据。
  sass: {
    data: '$theme-tokens: (' + Object.entries(themeTokens)
      .map(([name, value]) => JSON.stringify(name) + ': ' + JSON.stringify(value))
      .join(',') + ');'
  },
  compiler: {
    type: 'webpack5',
    prebundle: {
      exclude: ['three']
    }
  },
  plugins: [
    '@tarojs/plugin-platform-weapp',
    '@tarojs/plugin-platform-tt',
    '@tarojs/plugin-platform-jd'
  ],
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
    '@shared': path.resolve(__dirname, '..', '..', '..', 'packages', 'shared', 'src')
  },
  compile: {
    include: [path.resolve(__dirname, '..', '..', '..', 'packages', 'shared', 'src')]
  },
  copy: {
    patterns: [{ from: 'src/privacy.json', to: `${outputRoot}/privacy.json` }],
    options: {}
  },
  // @ts-expect-error: overridden by dev/prod spread
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false
      }
    }
  },
  // @ts-expect-error: overridden by dev/prod spread
  h5: {
    publicPath: '/',
    staticDirectory: 'static'
  },
  ...(process.env.NODE_ENV === 'production' ? prodConfig : devConfig)
});
