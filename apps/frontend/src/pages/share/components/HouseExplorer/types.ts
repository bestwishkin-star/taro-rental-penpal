import type { Canvas } from '@tarojs/components';
import type { ComponentProps } from 'react';

export type HouseModuleId =
  | 'kitchen'
  | 'bathroom'
  | 'living'
  | 'bedroom'
  | 'hallway'
  | 'neighborhood';

export interface HouseModule {
  id: HouseModuleId;
  label: string;
  prompt: string;
  completed: boolean;
}

export interface HouseExplorerProps {
  modules: HouseModule[];
  selectedId: HouseModuleId | null;
  /** 服务端计算的房屋资料完整度百分比，取值范围为 0-100。 */
  completion: number;
  onSelect: (id: HouseModuleId) => void;
  onDismiss: () => void;
  onSupplement: (id: HouseModuleId) => void;
}

export type CanvasTouchEvent = Parameters<NonNullable<ComponentProps<typeof Canvas>['onTouchStart']>>[0];

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

export interface CanvasQueryResult {
  node?: MiniCanvasNode;
  width?: number;
  height?: number;
}
