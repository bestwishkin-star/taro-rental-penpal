import path from 'node:path';

import { defineConfig } from '@tarojs/cli';

import devConfig from './dev';
import prodConfig from './prod';

export default defineConfig<'webpack5'>({
  projectName: 'taro-rental-penpal-v2',
  date: '2026-03-03',
  designWidth: 375,
  deviceRatio: {
    375: 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
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
    patterns: [],
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
