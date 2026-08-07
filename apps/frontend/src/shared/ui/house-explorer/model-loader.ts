import Taro from '@tarojs/taro';
import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ensureTextDecoder } from './text-decoder';

function normalizeArrayBuffer(data: string | ArrayBuffer) {
  if (typeof data === 'string') {
    throw new Error('GLB read failed: expected binary data but received text');
  }

  // Mini-program file APIs can return an ArrayBuffer from another JS realm.
  // Copying through a typed array makes Three's instanceof ArrayBuffer check reliable.
  const source = new Uint8Array(data);
  const normalized = new Uint8Array(source.byteLength);
  normalized.set(source);
  return normalized.buffer;
}

function decodeInlineGlb(source: string) {
  const marker = ';base64,';
  const markerIndex = source.indexOf(marker);
  if (!source.startsWith('data:') || markerIndex < 0) {
    throw new Error('GLB inline data is malformed');
  }
  return normalizeArrayBuffer(Taro.base64ToArrayBuffer(source.slice(markerIndex + marker.length)));
}

async function readLocalGlb(filePath: string) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    Taro.getFileSystemManager().readFile({
      filePath,
      success: (result) => {
        try {
          resolve(normalizeArrayBuffer(result.data));
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => reject(new Error(`GLB read failed: ${filePath}: ${error.errMsg}`))
    });
  });
}

export async function loadPackagedGlb(source: string): Promise<Group> {
  const data = source.startsWith('data:') ? decodeInlineGlb(source) : await readLocalGlb(source);
  ensureTextDecoder();

  return new Promise<Group>((resolve, reject) => {
    new GLTFLoader().parse(data, '', (gltf) => resolve(gltf.scene), reject);
  });
}
