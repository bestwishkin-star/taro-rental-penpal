import { inlineGlbAssets } from './inline-glb';

export default {
  env: {
    NODE_ENV: '"development"'
  },
  defineConstants: {
    'process.env.TARO_APP_API_BASE_URL': JSON.stringify('http://127.0.0.1:3000/api')
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
