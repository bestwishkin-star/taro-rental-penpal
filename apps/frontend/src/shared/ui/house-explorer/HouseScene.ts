import Taro from '@tarojs/taro';
import * as THREE from 'three';

import {
  HOTSPOTS,
  HOUSE_ASSETS,
  HOUSE_DEPTH,
  HOUSE_MAX_Y,
  HOUSE_MIN_Y,
  HOUSE_WIDTH,
  ROOMS,
  type HouseAssetConfig
} from './house-layout';
import { loadPackagedGlb } from './model-loader';
import type { HouseModule, HouseModuleId, MiniCanvasNode } from './types';

/** 单个发光热点在 Three.js 场景中的运行时对象。 */
interface HotspotRuntime {
  id: HouseModuleId;
  sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  halo: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  completed: boolean;
  selected: boolean;
}

/** 单指旋转手势的起点、末点和移动距离。 */
interface OrbitState {
  active: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  distance: number;
}

/** 双指缩放手势开始时的距离和相机半径。 */
interface ZoomState {
  active: boolean;
  startDistance: number;
  startRadius: number;
}

/** 区分点击热点与拖动旋转的最小位移阈值。 */
const CLICK_THRESHOLD = 8;
/** 热点投影到屏幕后允许命中的像素半径。 */
const HOTSPOT_HIT_RADIUS = 42;
/** 相机默认距离以及允许缩放的边界。 */
const DEFAULT_CAMERA_RADIUS = 18.2;
const MIN_CAMERA_RADIUS = 12;
const MAX_CAMERA_RADIUS = 25;

/** 将数值约束在指定闭区间内。 */
function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** 补齐小程序 Canvas 缺失的 DOM 属性，适配 Three.js 渲染器。 */
function patchCanvasForThree(canvas: MiniCanvasNode, width: number, height: number) {
  canvas.clientWidth = width;
  canvas.clientHeight = height;
  canvas.style ??= {};
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.addEventListener ??= () => undefined;
  canvas.removeEventListener ??= () => undefined;
}

/** 克隆材质并分别配置暗态底层或完成度裁切亮层。 */
function cloneMaterial(material: THREE.Material, mode: 'base' | 'progress', plane: THREE.Plane) {
  const next = material.clone();
  if (next instanceof THREE.MeshStandardMaterial) {
    next.roughness = Math.max(next.roughness, 0.62);
    next.metalness = Math.min(next.metalness, 0.12);
    if (mode === 'base') {
      next.color.multiplyScalar(0.64);
      next.emissive.set('#111714');
      next.emissiveIntensity = 0.04;
    } else {
      next.emissive.copy(next.color).multiplyScalar(0.1);
      next.emissiveIntensity = 0.36;
    }
  } else if (next instanceof THREE.MeshBasicMaterial && mode === 'base') {
    next.color.multiplyScalar(0.52);
  }

  if (mode === 'progress') {
    next.clippingPlanes = [plane];
    next.clipShadows = false;
    next.polygonOffset = true;
    next.polygonOffsetFactor = -1;
    next.polygonOffsetUnits = -1;
  }
  next.needsUpdate = true;
  return next;
}

/** 遍历模型并替换为当前完成度模式对应的独立材质。 */
function replaceMaterials(root: THREE.Object3D, mode: 'base' | 'progress', plane: THREE.Plane) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => cloneMaterial(material, mode, plane))
      : cloneMaterial(object.material, mode, plane);
  });
}

/** 管理透明别墅场景、家具资源、热点交互和动画生命周期。 */
export class HouseScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly progressPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), HOUSE_MIN_Y);
  private readonly shellGroup = new THREE.Group();
  private readonly progressGroup = new THREE.Group();
  private readonly hotspotGroup = new THREE.Group();
  private readonly roomHighlights = new Map<HouseModuleId, THREE.Mesh>();
  private readonly hotspots: HotspotRuntime[] = [];
  private readonly projectedHotspot = new THREE.Vector3();
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly startedAt = Date.now();
  private frameId: number | null = null;
  private disposed = false;
  private tapCandidate = false;
  private width: number;
  private height: number;
  private yaw = -0.62;
  private pitch = 0.5;
  private radius = DEFAULT_CAMERA_RADIUS;
  private orbit: OrbitState = {
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    distance: 0
  };
  private zoom: ZoomState = {
    active: false,
    startDistance: 0,
    startRadius: DEFAULT_CAMERA_RADIUS
  };

  /** 创建渲染器、相机、房屋结构和持续动画。 */
  constructor(private readonly canvas: MiniCanvasNode, width: number, height: number) {
    this.width = width;
    this.height = height;
    patchCanvasForThree(canvas, width, height);

    const context = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false
    });
    if (!context) throw new Error('WebGL context unavailable');

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context,
      alpha: false,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(Taro.getSystemInfoSync().pixelRatio || 1, 1.65));
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor('#d9e5e8', 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.localClippingEnabled = true;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    this.requestFrame = canvas.requestAnimationFrame
      ? canvas.requestAnimationFrame.bind(canvas)
      : (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16) as unknown as number;

    this.scene.add(this.shellGroup, this.progressGroup, this.hotspotGroup);
    this.createLighting();
    this.createHouseShell();
    this.createEnvironment();
    this.createHotspots();
    this.updateCamera();
    this.renderFrame();
  }

  /** 顺序加载分包内家具 GLB，单个失败不会中断其余家具。 */
  async loadAssets() {
    for (const config of HOUSE_ASSETS) {
      if (this.disposed) return;
      try {
        const model = await loadPackagedGlb(config.source);
        if (this.disposed) {
          this.disposeObject(model);
          return;
        }
        this.addAsset(model, config);
      } catch (error) {
        console.warn(`[HouseScene] Failed to load ${config.fileName}`, error);
      }
    }
  }

  /** 同步 Canvas、相机宽高比和渲染器尺寸。 */
  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    patchCanvasForThree(this.canvas, width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  /** 根据空间完成状态和当前选中项更新热点与房间高亮。 */
  setModules(modules: HouseModule[], selectedId: HouseModuleId | null) {
    const state = new Map(modules.map((module) => [module.id, module]));
    this.hotspots.forEach((hotspot) => {
      hotspot.completed = state.get(hotspot.id)?.completed ?? false;
      hotspot.selected = hotspot.id === selectedId;
      const color = hotspot.completed ? '#3f9f79' : hotspot.selected ? '#d9823c' : '#e6a648';
      hotspot.sphere.material.color.set(color);
      hotspot.sphere.material.emissive.set(color);
      hotspot.sphere.material.emissiveIntensity = hotspot.selected ? 2.4 : hotspot.completed ? 1.45 : 1.85;
      hotspot.halo.material.color.set(color);
    });
    this.roomHighlights.forEach((highlight, id) => {
      highlight.visible = id === selectedId;
    });
  }

  /** 将 0-1 完成比例映射到房屋高度裁切平面。 */
  setCompletion(completion: number) {
    const normalized = clamp(completion, 0, 1);
    this.progressPlane.constant = HOUSE_MIN_Y + (HOUSE_MAX_Y - HOUSE_MIN_Y) * normalized;
  }

  /** 开始单指旋转并记录点击候选起点。 */
  beginOrbit(x: number, y: number) {
    this.zoom.active = false;
    this.tapCandidate = true;
    this.orbit = { active: true, startX: x, startY: y, lastX: x, lastY: y, distance: 0 };
  }

  /** 根据单指移动量更新水平和俯仰视角。 */
  moveOrbit(x: number, y: number) {
    if (!this.orbit.active) return;
    const deltaX = x - this.orbit.lastX;
    const deltaY = y - this.orbit.lastY;
    this.orbit.distance = Math.max(
      this.orbit.distance,
      Math.hypot(x - this.orbit.startX, y - this.orbit.startY)
    );
    this.orbit.lastX = x;
    this.orbit.lastY = y;
    this.yaw -= deltaX * 0.012;
    this.pitch = clamp(this.pitch + deltaY * 0.008, 0.3, 0.9);
    this.updateCamera();
  }

  /** 结束旋转，并根据总位移判断是否仍可视为热点点击。 */
  endOrbit(x?: number, y?: number) {
    if (!this.orbit.active) return;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      this.orbit.distance = Math.max(
        this.orbit.distance,
        Math.hypot((x as number) - this.orbit.startX, (y as number) - this.orbit.startY)
      );
    }
    this.orbit.active = false;
    if (this.orbit.distance > CLICK_THRESHOLD) this.tapCandidate = false;
  }

  /** 将最后一次有效点击投影到最近热点并返回空间标识。 */
  selectLastPointer() {
    if (!this.tapCandidate) return null;
    this.tapCandidate = false;

    let selectedId: HouseModuleId | null = null;
    let closestDistance = HOTSPOT_HIT_RADIUS;
    (Object.keys(HOTSPOTS) as HouseModuleId[]).forEach((id) => {
      this.projectedHotspot.fromArray(HOTSPOTS[id]).project(this.camera);
      if (this.projectedHotspot.z < -1 || this.projectedHotspot.z > 1) return;
      const screenX = ((this.projectedHotspot.x + 1) / 2) * this.width;
      const screenY = ((1 - this.projectedHotspot.y) / 2) * this.height;
      const distance = Math.hypot(screenX - this.orbit.startX, screenY - this.orbit.startY);
      if (distance >= closestDistance) return;
      closestDistance = distance;
      selectedId = id;
    });
    return selectedId;
  }

  /** 开始双指缩放并保存初始距离与相机半径。 */
  beginZoom(distance: number) {
    if (distance <= 0) return;
    this.orbit.active = false;
    this.tapCandidate = false;
    this.zoom = {
      active: true,
      startDistance: distance,
      startRadius: this.radius
    };
  }

  /** 根据双指距离变化实时更新相机半径。 */
  moveZoom(distance: number) {
    if (!this.zoom.active || distance <= 0) return;
    this.radius = clamp(
      this.zoom.startRadius * (this.zoom.startDistance / distance),
      MIN_CAMERA_RADIUS,
      MAX_CAMERA_RADIUS
    );
    this.updateCamera();
  }

  /** 结束双指缩放状态。 */
  endZoom() {
    this.zoom.active = false;
  }

  /** 供工具栏按钮按比例放大或缩小场景。 */
  zoomBy(scale: number) {
    if (scale <= 0) return;
    this.cancelInteraction();
    this.radius = clamp(this.radius * scale, MIN_CAMERA_RADIUS, MAX_CAMERA_RADIUS);
    this.updateCamera();
  }

  /** 触摸取消时清理旋转、缩放和点击候选状态。 */
  cancelInteraction() {
    this.orbit.active = false;
    this.zoom.active = false;
    this.tapCandidate = false;
  }

  /** 停止动画并释放渲染器、几何体、材质和纹理。 */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.frameId = null;
    this.disposeObject(this.scene);
    // WebGLRenderer.dispose() calls WebGLAnimation.stop(), whose browser `self`
    // context is null in mini-program runtimes. The native Canvas owns and
    // releases the WebGL context when the page is destroyed.
  }

  /** 创建环境光、半球光和主辅方向光。 */
  private createLighting() {
    this.scene.add(new THREE.HemisphereLight('#f8fbfa', '#657a66', 2.25));
    const keyLight = new THREE.DirectionalLight('#fff4df', 2.7);
    keyLight.position.set(-7, 11, 9);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#b9dce2', 1.15);
    fillLight.position.set(8, 7, -7);
    this.scene.add(fillLight);
    const interiorLight = new THREE.PointLight('#ffd9a2', 2.4, 13);
    interiorLight.position.set(0.6, 3.2, 1.1);
    this.scene.add(interiorLight);
  }

  /** 构建透明别墅主体、楼层、玻璃墙和室内结构。 */
  private createHouseShell() {
    ROOMS.filter((room) => room.id !== 'neighborhood').forEach((room) => {
      this.addLayeredBox(
        new THREE.BoxGeometry(room.size[0], 0.12, room.size[1]),
        [room.center[0], room.floorY - 0.06, room.center[1]],
        room.floorColor
      );
      const highlight = this.createHighlight(room.size, room.highlightColor);
      highlight.position.set(room.center[0], room.floorY + 0.035, room.center[1]);
      this.shellGroup.add(highlight);
      this.roomHighlights.set(room.id, highlight);
    });

    const concrete = '#efefeb';
    const stone = '#68706e';
    const metal = '#202827';
    const wood = '#9a643e';
    const glass = '#78a6af';
    const led = '#62dce2';

    this.addLayeredBox(new THREE.BoxGeometry(HOUSE_WIDTH, 0.18, HOUSE_DEPTH), [0, -0.1, 0], concrete);
    this.addLayeredGlass([0.05, 2.36, -0.05], [9.9, 0.16, 6.65], glass, 0.18);
    this.addLayeredGlass([0.1, 4.78, -0.05], [10.2, 0.16, 6.8], glass, 0.2);
    this.addLayeredGlass([1.35, 5.05, -0.15], [6.2, 0.1, 6.3], glass, 0.16);

    [2.36, 4.78].forEach((y) => {
      this.addLayeredBox(new THREE.BoxGeometry(10.05, 0.16, 0.14), [0.05, y, -3.32], concrete);
      this.addLayeredBox(new THREE.BoxGeometry(10.05, 0.16, 0.14), [0.05, y, 3.22], concrete);
      this.addLayeredBox(new THREE.BoxGeometry(0.14, 0.16, 6.55), [-4.9, y, -0.05], concrete);
      this.addLayeredBox(new THREE.BoxGeometry(0.14, 0.16, 6.55), [5, y, -0.05], concrete);
    });

    this.addLayeredGlass([0, 1.12, -3.42], [9.7, 2.25, 0.1], glass);
    this.addLayeredGlass([0.15, 3.58, -3.42], [9.8, 2.25, 0.1], glass);
    this.addLayeredGlass([4.82, 1.12, -0.45], [0.1, 2.25, 5.85], glass);
    this.addLayeredGlass([4.82, 3.58, -0.45], [0.1, 2.25, 5.85], glass);

    this.addLayeredGlass([-4.2, 2.35, 3.08], [1.45, 4.68, 0.1], glass, 0.2);
    this.addLayeredBox(new THREE.BoxGeometry(0.12, 4.68, 0.14), [-4.9, 2.35, 3.12], stone);
    this.addLayeredBox(new THREE.BoxGeometry(0.12, 4.68, 0.14), [-3.5, 2.35, 3.12], stone);
    this.addLayeredBox(new THREE.BoxGeometry(1.25, 1.88, 0.12), [-0.45, 0.94, 3.18], wood);
    this.addLayeredBox(new THREE.BoxGeometry(0.08, 1.2, 0.04), [-0.08, 1.02, 3.26], metal);

    this.addLayeredGlass([-2.95, 1.15, 3.18], [0.85, 1.92, 0.08], glass);
    this.addLayeredGlass([2.15, 1.15, 3.18], [4.6, 1.92, 0.08], glass);
    this.addLayeredGlass([-2.95, 3.62, 3.18], [0.85, 1.9, 0.08], glass);
    this.addLayeredGlass([2.15, 3.62, 3.18], [4.6, 1.9, 0.08], glass);
    this.addLayeredGlass([-4.86, 1.16, 0.25], [0.08, 1.92, 4.9], glass);
    this.addLayeredGlass([-4.86, 3.62, 0.25], [0.08, 1.9, 4.9], glass);

    [-3.38, -2.52, -0.08, 1.1, 2.25, 3.42, 4.48].forEach((x) => {
      this.addLayeredBox(new THREE.BoxGeometry(0.055, 1.94, 0.12), [x, 1.15, 3.23], metal);
      this.addLayeredBox(new THREE.BoxGeometry(0.055, 1.92, 0.12), [x, 3.62, 3.23], metal);
    });
    [-2.15, -0.65, 0.85, 2.25].forEach((z) => {
      this.addLayeredBox(new THREE.BoxGeometry(0.12, 1.92, 0.055), [-4.9, 1.15, z], metal);
      this.addLayeredBox(new THREE.BoxGeometry(0.12, 1.9, 0.055), [-4.9, 3.62, z], metal);
    });

    this.addLayeredGlass([0.18, 1.1, -0.15], [0.08, 2.2, 6.1], glass, 0.18);
    this.addLayeredGlass([-2.55, 1.1, -0.25], [4.45, 2.2, 0.08], glass, 0.18);
    this.addLayeredGlass([2.55, 3.56, -0.18], [4.25, 2.2, 0.08], glass, 0.18);

    this.addLayeredBox(new THREE.BoxGeometry(5.15, 0.14, 1.05), [2.15, 2.47, 3.52], concrete);
    this.addLayeredGlass([2.15, 2.93, 4], [5.05, 0.86, 0.06], glass, 0.42);
    [-0.33, 0.9, 2.15, 3.4, 4.65].forEach((x) => {
      this.addLayeredBox(new THREE.BoxGeometry(0.045, 0.88, 0.08), [x, 2.93, 4.02], metal);
    });

    for (let index = 0; index < 8; index += 1) {
      const y = 0.12 + index * 0.27;
      const z = 1.45 - index * 0.34;
      this.addLayeredBox(new THREE.BoxGeometry(0.9, 0.12, 0.38), [0.22, y, z], wood);
    }

    this.addLayeredBox(new THREE.BoxGeometry(9.7, 0.035, 0.06), [0.1, 2.24, 3.28], led);
    this.addLayeredBox(new THREE.BoxGeometry(9.9, 0.035, 0.06), [0.1, 4.66, 3.28], led);
    this.addLayeredBox(new THREE.BoxGeometry(5.8, 0.035, 0.06), [1.35, 4.96, 3.06], led);
  }

  /** 构建庭院、道路、绿地、树木和周边环境高亮。 */
  private createEnvironment() {
    this.addStaticBox([14.2, 0.12, 12], [0, -0.24, 1.25], '#c8cbc5');
    this.addStaticBox([4.35, 0.09, 4.2], [-3.85, -0.14, 4.2], '#547650');
    this.addStaticBox([4.1, 0.09, 4.15], [3.9, -0.14, 4.25], '#5d7c55');
    this.addStaticBox([4.05, 0.08, 3.45], [-1.05, -0.13, 5.15], '#737a78');
    this.addStaticBox([14.2, 0.1, 1.7], [0, -0.18, 7.15], '#626866');

    [-2.1, -1.18, -0.25, 0.68, 1.61].forEach((x, index) => {
      this.addStaticBox([0.72, 0.07, 0.48], [x, -0.07 + index * 0.012, 4.15 + index * 0.46], '#e7e4dc');
    });

    this.addStaticBox([4.15, 0.72, 0.16], [-4.85, 0.28, 6.08], '#ecece8');
    this.addStaticBox([3.8, 0.72, 0.16], [4.95, 0.28, 6.08], '#ecece8');
    this.addStaticBox([3.35, 0.76, 0.12], [-0.4, 0.3, 6.1], '#222a29');
    this.addStaticBox([0.16, 0.72, 7.2], [-6.72, 0.28, 2.45], '#ecece8');
    this.addStaticBox([0.16, 0.72, 7.2], [6.72, 0.28, 2.45], '#ecece8');

    this.addTree(-5.65, 4.15, 0.9);
    this.addTree(5.55, 4.2, 0.82);
    this.addTree(5.8, -0.8, 0.72);
    this.addTree(-5.65, -1.35, 0.66);
    [-4.2, -3.65, -3.1, 2.9, 3.45, 4, 4.55].forEach((x, index) => {
      this.addShrub(x, 3.55 + (index % 2) * 0.22, 0.32 + (index % 3) * 0.035);
    });

    this.addStaticBox([0.72, 0.55, 0.72], [-3.8, 0.2, 3.62], '#333b39');
    this.addStaticBox([0.72, 0.55, 0.72], [4.05, 0.2, 3.62], '#333b39');

    const neighborhood = ROOMS.find((room) => room.id === 'neighborhood');
    if (!neighborhood) return;
    const highlight = this.createHighlight(neighborhood.size, neighborhood.highlightColor);
    highlight.position.set(neighborhood.center[0], neighborhood.floorY + 0.035, neighborhood.center[1]);
    this.shellGroup.add(highlight);
    this.roomHighlights.set('neighborhood', highlight);
  }

  /** 创建选中空间使用的半透明地面高亮。 */
  private createHighlight(size: [number, number], color: string) {
    const highlight = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0] - 0.12, size[1] - 0.12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    highlight.rotation.x = -Math.PI / 2;
    highlight.visible = false;
    return highlight;
  }

  /** 为六个空间创建发光球和呼吸光环。 */
  private createHotspots() {
    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 12);
    const haloGeometry = new THREE.TorusGeometry(0.24, 0.032, 8, 24);
    (Object.keys(HOTSPOTS) as HouseModuleId[]).forEach((id) => {
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: '#e6a648',
        emissive: '#e6a648',
        emissiveIntensity: 1.85,
        roughness: 0.34,
        metalness: 0.05,
        depthTest: false,
        depthWrite: false
      });
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: '#e6a648',
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      sphere.position.fromArray(HOTSPOTS[id]);
      halo.position.copy(sphere.position);
      sphere.renderOrder = 20;
      halo.renderOrder = 21;
      this.hotspotGroup.add(sphere, halo);
      this.hotspots.push({ id, sphere, halo, completed: false, selected: false });
    });
  }

  /** 同时添加暗态底层和受完成度裁切的亮态盒体。 */
  private addLayeredBox(geometry: THREE.BufferGeometry, position: [number, number, number], color: string) {
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.62),
      roughness: 0.84,
      metalness: 0.02
    });
    const progressMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0.02,
      emissive: new THREE.Color(color).multiplyScalar(0.1),
      emissiveIntensity: 0.42,
      clippingPlanes: [this.progressPlane],
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const base = new THREE.Mesh(geometry, baseMaterial);
    const progress = new THREE.Mesh(geometry, progressMaterial);
    base.position.fromArray(position);
    progress.position.fromArray(position);
    this.shellGroup.add(base);
    this.progressGroup.add(progress);
  }

  /** 同时添加暗态与亮态透明玻璃结构。 */
  private addLayeredGlass(
    position: [number, number, number],
    size: [number, number, number],
    color: string,
    opacity = 0.24
  ) {
    const geometry = new THREE.BoxGeometry(...size);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.52),
      transparent: true,
      opacity: Math.max(0.12, opacity * 0.48),
      roughness: 0.24,
      metalness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const progressMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.09),
      emissiveIntensity: 0.34,
      transparent: true,
      opacity,
      roughness: 0.16,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
      clippingPlanes: [this.progressPlane],
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const base = new THREE.Mesh(geometry, baseMaterial);
    const progress = new THREE.Mesh(geometry, progressMaterial);
    base.position.fromArray(position);
    progress.position.fromArray(position);
    this.shellGroup.add(base);
    this.progressGroup.add(progress);
  }

  /** 添加不参与完成度裁切的静态盒体。 */
  private addStaticBox(size: [number, number, number], position: [number, number, number], color: string) {
    this.addStaticMesh(new THREE.BoxGeometry(...size), position, color);
  }

  /** 使用统一材质创建静态环境网格。 */
  private addStaticMesh(geometry: THREE.BufferGeometry, position: [number, number, number], color: string) {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.02 })
    );
    mesh.position.fromArray(position);
    this.shellGroup.add(mesh);
    return mesh;
  }

  /** 在庭院指定位置组合树干和多层树冠。 */
  private addTree(x: number, z: number, scale: number) {
    this.addStaticMesh(
      new THREE.CylinderGeometry(0.11 * scale, 0.16 * scale, 1.45 * scale, 8),
      [x, 0.68 * scale, z],
      '#72543d'
    );
    const foliage = [
      [-0.22, 1.45, 0, 0.58],
      [0.24, 1.55, 0.08, 0.54],
      [0, 1.92, -0.03, 0.62]
    ] as const;
    foliage.forEach(([offsetX, y, offsetZ, radius], index) => {
      const crown = this.addStaticMesh(
        new THREE.SphereGeometry(radius * scale, 12, 8),
        [x + offsetX * scale, y * scale, z + offsetZ * scale],
        index === 2 ? '#64865b' : '#4d744f'
      );
      crown.scale.y = 1.22;
    });
  }

  /** 在庭院指定位置添加低矮灌木。 */
  private addShrub(x: number, z: number, radius: number) {
    const shrub = this.addStaticMesh(
      new THREE.SphereGeometry(radius, 10, 7),
      [x, radius * 0.78, z],
      '#52794f'
    );
    shrub.scale.y = 0.72;
  }

  /** 按配置缩放、定位家具并生成暗亮双层模型。 */
  private addAsset(model: THREE.Group, config: HouseAssetConfig) {
    const initialSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const longest = Math.max(initialSize.x, initialSize.y, initialSize.z) || 1;
    model.scale.setScalar(config.targetSize / longest);
    model.rotation.y = config.rotationY;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    model.position.set(config.position[0], config.position[1] - bounds.min.y, config.position[2]);
    model.updateMatrixWorld(true);

    const progressModel = model.clone(true);
    replaceMaterials(model, 'base', this.progressPlane);
    replaceMaterials(progressModel, 'progress', this.progressPlane);
    this.shellGroup.add(model);
    this.progressGroup.add(progressModel);
  }

  /** 根据球面视角参数更新相机位置并对准房屋中心。 */
  private updateCamera() {
    const horizontal = Math.cos(this.pitch) * this.radius;
    this.camera.position.set(
      Math.sin(this.yaw) * horizontal,
      Math.sin(this.pitch) * this.radius,
      Math.cos(this.yaw) * horizontal
    );
    this.camera.lookAt(0, 2.05, 0.45);
  }

  /** 驱动热点呼吸动画并提交当前帧。 */
  private renderFrame = () => {
    if (this.disposed) return;
    const elapsed = (Date.now() - this.startedAt) / 1000;
    this.hotspots.forEach((hotspot, index) => {
      const pulse = (Math.sin(elapsed * 2.8 + index * 0.68) + 1) / 2;
      hotspot.sphere.scale.setScalar((hotspot.selected ? 1.22 : 1) + pulse * 0.12);
      hotspot.halo.scale.setScalar(0.86 + pulse * (hotspot.selected ? 0.52 : 0.34));
      hotspot.halo.material.opacity = hotspot.selected ? 0.48 + pulse * 0.3 : 0.26 + pulse * 0.22;
      hotspot.halo.lookAt(this.camera.position);
    });
    this.renderer.render(this.scene, this.camera);
    this.frameId = this.requestFrame(this.renderFrame);
  };

  /** 去重收集并释放对象树中的几何体、材质和纹理。 */
  private disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => {
        materials.add(material);
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.emissiveMap]
          .filter((texture): texture is THREE.Texture => Boolean(texture))
          .forEach((texture) => textures.add(texture));
      });
    });
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
  }
}
