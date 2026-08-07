import type { HouseModuleId } from '@shared/contracts/rental-space';
import type { Canvas } from '@tarojs/components';
import type { ComponentProps } from 'react';

export type { HouseModuleId };

/** 三维房屋热点的显示状态。 */
export interface HouseModule {
  id: HouseModuleId;
  label: string;
  prompt: string;
  completed: boolean;
}

/** 共享房屋场景属性，编辑文案由页面包装层负责。 */
export interface HouseExplorerProps {
  modules: HouseModule[];
  selectedId: HouseModuleId | null;
  /** 服务端计算的房屋资料完整度百分比，取值范围为 0-100。 */
  completion: number;
  mode?: 'edit' | 'readonly';
  onSelect: (id: HouseModuleId) => void;
  onWebglUnavailable?: () => void;
}

/** Taro Canvas 触摸事件类型。 */
export type CanvasTouchEvent = Parameters<
  NonNullable<ComponentProps<typeof Canvas>['onTouchStart']>
>[0];

/** 微信小程序 WebGL Canvas 节点的最小适配接口。 */
export interface MiniCanvasNode {
  width: number;
  height: number;
  clientWidth?: number;
  clientHeight?: number;
  style?: Record<string, string>;
  getContext: (type: string, options?: Record<string, unknown>) => WebGLRenderingContext | null;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
}

/** SelectorQuery 返回的 Canvas 节点和尺寸。 */
export interface CanvasQueryResult {
  node?: MiniCanvasNode;
  width?: number;
  height?: number;
}
