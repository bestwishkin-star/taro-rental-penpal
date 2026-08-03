import { inlineGlbAssets } from './inline-glb';

export default {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
    'process.env.TARO_APP_API_BASE_URL': JSON.stringify('https://api.example.com/api')
  },
  mini: {
    enableSourceMap: false,
    optimizeMainPackage: {
      enable: true
    },
    webpackChain: inlineGlbAssets
  },
  h5: {}
};
