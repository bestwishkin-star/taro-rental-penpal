interface WebpackRule {
  test(pattern: RegExp): WebpackRule;
  type(value: string): WebpackRule;
}

interface WebpackChain {
  module: {
    rule(name: string): WebpackRule;
  };
}

export function inlineGlbAssets(chain: WebpackChain) {
  chain.module.rule('glb-inline').test(/\.glb$/).type('asset/inline');
}
