import { Canvas, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';

import { HouseScene } from './HouseScene';
import type {
  CanvasQueryResult,
  CanvasTouchEvent,
  HouseExplorerProps
} from './types';

import './index.scss';

export type { HouseModule, HouseModuleId } from './types';

const CANVAS_ID = 'share-house-webgl';
const MAX_INIT_ATTEMPTS = 8;
const COMPLETION_LABEL = '\u5b8c\u6574\u5ea6';
const LOADING_LABEL = '\u6b63\u5728\u5e03\u7f6e\u623f\u95f4';
type GestureMode = 'idle' | 'orbit' | 'zoom';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** 将服务端的 0-100 完成百分比转换为 Three.js 裁切平面使用的 0-1 比例。 */
function toCompletionRatio(completion: number) {
  return clamp(completion, 0, 100) / 100;
}

export function HouseExplorer({
  modules,
  selectedId,
  completion,
  onSelect,
  onWebglUnavailable
}: HouseExplorerProps) {
  const sceneRef = useRef<HouseScene | null>(null);
  const stateRef = useRef({ modules, selectedId, completion });
  const onSelectRef = useRef(onSelect);
  const onWebglUnavailableRef = useRef(onWebglUnavailable);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureModeRef = useRef<GestureMode>('idle');
  const [assetsLoading, setAssetsLoading] = useState(true);

  stateRef.current = { modules, selectedId, completion };
  onSelectRef.current = onSelect;
  onWebglUnavailableRef.current = onWebglUnavailable;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setModules(modules, selectedId);
    scene.setCompletion(toCompletionRatio(completion));
  }, [completion, modules, selectedId]);

  useEffect(() => {
    let disposed = false;

    function initialize(attempt = 0) {
      Taro.createSelectorQuery()
        .select(`#${CANVAS_ID}`)
        .fields({ node: true, size: true })
        .exec((results) => {
          if (disposed) return;
          const result = results?.[0] as CanvasQueryResult | undefined;
          const width = result?.width ?? 0;
          const height = result?.height ?? 0;

          if (!result?.node || width <= 0 || height <= 0) {
            if (attempt < MAX_INIT_ATTEMPTS) {
              retryTimerRef.current = setTimeout(() => initialize(attempt + 1), 80);
            } else {
              setAssetsLoading(false);
              onWebglUnavailableRef.current?.();
            }
            return;
          }

          try {
            const scene = new HouseScene(result.node, width, height);
            const current = stateRef.current;
            scene.setModules(current.modules, current.selectedId);
            scene.setCompletion(toCompletionRatio(current.completion));
            sceneRef.current = scene;
            void scene.loadAssets().finally(() => {
              if (!disposed) setAssetsLoading(false);
            });
          } catch (error) {
            setAssetsLoading(false);
            onWebglUnavailableRef.current?.();
            console.warn('[HouseExplorer] WebGL scene initialization failed', error);
          }
        });
    }

    Taro.nextTick(() => initialize());

    return () => {
      disposed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  function getTouchPoint(event: CanvasTouchEvent) {
    return event.changedTouches[0] ?? event.touches[0] ?? null;
  }

  function getTouchDistance(event: CanvasTouchEvent) {
    const first = event.touches[0];
    const second = event.touches[1];
    if (!first || !second) return 0;
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function handleTouchStart(event: CanvasTouchEvent) {
    if (event.touches.length >= 2) {
      gestureModeRef.current = 'zoom';
      sceneRef.current?.beginZoom(getTouchDistance(event));
      return;
    }

    const point = event.touches[0];
    if (!point) return;
    gestureModeRef.current = 'orbit';
    sceneRef.current?.beginOrbit(point.x, point.y);
  }

  function handleTouchMove(event: CanvasTouchEvent) {
    if (event.touches.length >= 2) {
      const distance = getTouchDistance(event);
      if (gestureModeRef.current !== 'zoom') {
        gestureModeRef.current = 'zoom';
        sceneRef.current?.beginZoom(distance);
      }
      sceneRef.current?.moveZoom(distance);
      return;
    }

    if (gestureModeRef.current !== 'orbit') return;
    const point = event.touches[0];
    if (!point) return;
    sceneRef.current?.moveOrbit(point.x, point.y);
  }

  function handleTouchEnd(event: CanvasTouchEvent) {
    if (gestureModeRef.current === 'zoom') {
      sceneRef.current?.endZoom();
      gestureModeRef.current = 'idle';
      return;
    }

    if (gestureModeRef.current !== 'orbit') return;
    const point = getTouchPoint(event);
    if (!point) {
      sceneRef.current?.endOrbit();
      gestureModeRef.current = 'idle';
      return;
    }
    sceneRef.current?.endOrbit(point.x, point.y);
    gestureModeRef.current = 'idle';
  }

  function handleCanvasClick() {
    const moduleId = sceneRef.current?.selectLastPointer();
    if (moduleId) onSelectRef.current(moduleId);
  }

  function handleTouchCancel() {
    gestureModeRef.current = 'idle';
    sceneRef.current?.cancelInteraction();
  }

  const completionPercent = Math.round(clamp(completion, 0, 100));
  return (
    <View className="house-explorer">
      <View className="house-explorer__toolbar">
        <View className="house-explorer__progress">
          <Text className="house-explorer__progress-label">{COMPLETION_LABEL}</Text>
          <Text className="house-explorer__progress-value">{completionPercent}%</Text>
        </View>
        <View className="house-explorer__zoom-controls">
          <View
            className="house-explorer__zoom-button"
            hoverClass="house-explorer__zoom-button--pressed"
            onClick={() => sceneRef.current?.zoomBy(0.84)}
          >
            <Text className="house-explorer__zoom-icon">+</Text>
          </View>
          <View className="house-explorer__zoom-divider" />
          <View
            className="house-explorer__zoom-button"
            hoverClass="house-explorer__zoom-button--pressed"
            onClick={() => sceneRef.current?.zoomBy(1.19)}
          >
            <Text className="house-explorer__zoom-icon">-</Text>
          </View>
        </View>
      </View>
      <View className="house-explorer__stage">
        <Canvas
          id={CANVAS_ID}
          canvasId={CANVAS_ID}
          className="house-explorer__canvas"
          type="webgl"
          disableScroll
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClick={handleCanvasClick}
        />
      </View>
      {assetsLoading && (
        <View className="house-explorer__loading">
          <View className="house-explorer__loading-dot" />
          <Text className="house-explorer__loading-text">{LOADING_LABEL}</Text>
        </View>
      )}
    </View>
  );
}
