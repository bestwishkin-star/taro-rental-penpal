/** Layout 支持的页面滚动模式。 */
export type AppLayoutMode = 'native' | 'list' | 'static';

/** 生成 Layout class 时需要的页面布局选项。 */
export interface AppLayoutClassOptions {
  mode: AppLayoutMode;
  safeAreaBottom: boolean;
  withTabBar?: boolean;
  contentClassName?: string;
}

/** Layout 根节点、滚动节点和内容节点的 class 集合。 */
export interface AppLayoutClassNames {
  root: string;
  scroll: string;
  content: string;
}

/** 统一生成 Layout 各层节点的 class，避免组件分支产生不一致结构。 */
export function buildAppLayoutClasses(options: AppLayoutClassOptions): AppLayoutClassNames {
  return {
    root: [
      'app-layout',
      `app-layout--${options.mode}`,
      options.safeAreaBottom ? 'app-layout--safe-bottom' : '',
      options.withTabBar ? 'app-layout--with-tab-bar' : ''
    ]
      .filter(Boolean)
      .join(' '),
    scroll: `app-layout__scroll app-layout__scroll--${options.mode}`,
    content: ['app-layout__content', options.contentClassName].filter(Boolean).join(' ')
  };
}
