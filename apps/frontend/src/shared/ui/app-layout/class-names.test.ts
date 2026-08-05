import { describe, expect, it } from 'vitest';

import { buildAppLayoutClasses } from './class-names';

describe('buildAppLayoutClasses', () => {
  it('默认生成原生滚动和底部安全区 class', () => {
    expect(buildAppLayoutClasses({ mode: 'native', safeAreaBottom: true })).toEqual({
      root: 'app-layout app-layout--native app-layout--safe-bottom',
      scroll: 'app-layout__scroll app-layout__scroll--native',
      content: 'app-layout__content'
    });
  });

  it('列表页生成 TabBar 占位和自定义内容 class', () => {
    expect(
      buildAppLayoutClasses({
        mode: 'list',
        safeAreaBottom: true,
        withTabBar: true,
        contentClassName: 'find-page'
      })
    ).toEqual({
      root: 'app-layout app-layout--list app-layout--safe-bottom app-layout--with-tab-bar',
      scroll: 'app-layout__scroll app-layout__scroll--list',
      content: 'app-layout__content find-page'
    });
  });

  it('关闭安全区时不生成安全区 class', () => {
    expect(buildAppLayoutClasses({ mode: 'static', safeAreaBottom: false }).root).toBe(
      'app-layout app-layout--static'
    );
  });
});
