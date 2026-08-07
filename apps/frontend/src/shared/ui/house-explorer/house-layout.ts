import type { HouseModuleId } from './types';

import bathroomSinkModel from '../../assets/models/house-explorer/bathroom-sink.glb';
import bathtubModel from '../../assets/models/house-explorer/bathtub.glb';
import bedSingleModel from '../../assets/models/house-explorer/bed-single.glb';
import couchMediumModel from '../../assets/models/house-explorer/couch-medium.glb';
import doorModel from '../../assets/models/house-explorer/door.glb';
import houseplantModel from '../../assets/models/house-explorer/houseplant.glb';
import kitchenFridgeModel from '../../assets/models/house-explorer/kitchen-fridge.glb';
import kitchenSinkModel from '../../assets/models/house-explorer/kitchen-sink.glb';
import lightFloorModel from '../../assets/models/house-explorer/light-floor.glb';
import nightStandModel from '../../assets/models/house-explorer/night-stand.glb';
import ovenModel from '../../assets/models/house-explorer/oven.glb';
import tableRoundSmallModel from '../../assets/models/house-explorer/table-round-small.glb';
import toiletModel from '../../assets/models/house-explorer/toilet.glb';

export const HOUSE_WIDTH = 10;
export const HOUSE_DEPTH = 7;
export const HOUSE_MIN_Y = -0.2;
export const HOUSE_MAX_Y = 5.18;

export interface RoomDefinition {
  id: HouseModuleId;
  center: [number, number];
  size: [number, number];
  floorY: number;
  floorColor: string;
  highlightColor: string;
}

export interface HouseAssetConfig {
  id: string;
  moduleId: HouseModuleId;
  fileName: string;
  source: string;
  position: [number, number, number];
  rotationY: number;
  targetSize: number;
}

export const ROOMS: RoomDefinition[] = [
  { id: 'kitchen', center: [-2.55, -1.7], size: [4.5, 2.8], floorY: 0, floorColor: '#d9d5cb', highlightColor: '#f0b85b' },
  { id: 'living', center: [-2.55, 1.35], size: [4.5, 2.9], floorY: 0, floorColor: '#caa879', highlightColor: '#d98b5f' },
  { id: 'hallway', center: [0.15, 0], size: [1.05, 6.2], floorY: 0, floorColor: '#c7bca9', highlightColor: '#8f826f' },
  { id: 'bathroom', center: [2.75, -1.55], size: [4, 2.7], floorY: 2.45, floorColor: '#c9d8d7', highlightColor: '#68aeb1' },
  { id: 'bedroom', center: [2.75, 1.35], size: [4, 2.8], floorY: 2.45, floorColor: '#b98f68', highlightColor: '#c47772' },
  { id: 'neighborhood', center: [-2.9, 4.55], size: [3.5, 1.4], floorY: 0, floorColor: '#91ad79', highlightColor: '#6f9b69' }
];

export const HOTSPOTS: Record<HouseModuleId, [number, number, number]> = {
  kitchen: [-2.8, 1.15, -1.75],
  bathroom: [2.9, 3.62, -1.55],
  living: [-2.55, 1.18, 1.3],
  bedroom: [2.85, 3.68, 1.25],
  hallway: [0.15, 1.18, 0.45],
  neighborhood: [-2.9, 0.92, 4.55]
};

export const HOUSE_ASSETS: HouseAssetConfig[] = [
  { id: 'kitchen-sink', moduleId: 'kitchen', fileName: 'kitchen-sink.glb', source: kitchenSinkModel, position: [-3.25, 0, -2.72], rotationY: 0, targetSize: 1.3 },
  { id: 'kitchen-fridge', moduleId: 'kitchen', fileName: 'kitchen-fridge.glb', source: kitchenFridgeModel, position: [-4.05, 0, -1.55], rotationY: Math.PI / 2, targetSize: 1.5 },
  { id: 'oven', moduleId: 'kitchen', fileName: 'oven.glb', source: ovenModel, position: [-2.25, 0, -2.72], rotationY: 0, targetSize: 1.1 },
  { id: 'bathroom-sink', moduleId: 'bathroom', fileName: 'bathroom-sink.glb', source: bathroomSinkModel, position: [1.65, 2.45, -2.7], rotationY: 0, targetSize: 0.9 },
  { id: 'toilet', moduleId: 'bathroom', fileName: 'toilet.glb', source: toiletModel, position: [4.05, 2.45, -2.1], rotationY: -Math.PI / 2, targetSize: 0.86 },
  { id: 'bathtub', moduleId: 'bathroom', fileName: 'bathtub.glb', source: bathtubModel, position: [3, 2.45, -0.75], rotationY: Math.PI / 2, targetSize: 1.48 },
  { id: 'couch-medium', moduleId: 'living', fileName: 'couch-medium.glb', source: couchMediumModel, position: [-3.05, 0, 1.35], rotationY: Math.PI / 2, targetSize: 2 },
  { id: 'table-round-small', moduleId: 'living', fileName: 'table-round-small.glb', source: tableRoundSmallModel, position: [-1.65, 0, 1.2], rotationY: 0, targetSize: 0.88 },
  { id: 'light-floor', moduleId: 'living', fileName: 'light-floor.glb', source: lightFloorModel, position: [-4.15, 0, 2.25], rotationY: 0, targetSize: 1.1 },
  { id: 'bed-single', moduleId: 'bedroom', fileName: 'bed-single.glb', source: bedSingleModel, position: [2.8, 2.45, 1.05], rotationY: Math.PI, targetSize: 2.1 },
  { id: 'night-stand', moduleId: 'bedroom', fileName: 'night-stand.glb', source: nightStandModel, position: [4, 2.45, 2.05], rotationY: 0, targetSize: 0.68 },
  { id: 'door', moduleId: 'hallway', fileName: 'door.glb', source: doorModel, position: [0.15, 0, 3.05], rotationY: Math.PI, targetSize: 1.7 },
  { id: 'houseplant', moduleId: 'neighborhood', fileName: 'houseplant.glb', source: houseplantModel, position: [-2.9, 0, 4.55], rotationY: 0, targetSize: 1.1 }
];
