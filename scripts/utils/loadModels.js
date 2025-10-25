import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// === Простой кэш моделей (глобально внутри модуля) ===
const modelCache = new Map();

/**
 * Загружает несколько копий GLTF-модели и случайно размещает их вокруг центра сцены.
 * Использует кэш, чтобы не перезагружать один и тот же файл.
 *
 * @param {THREE.Scene} scene - сцена, куда добавляем модели
 * @param {string} modelUrl - путь к .glb модели
 * @param {number} count - количество копий модели
 * @param {number} radius - радиус разброса вокруг центра
 * @param {Object} multipliers - множители разброса по осям {x, y, z}
 * @param {number} scaleMult - множитель масштаба
 */
export async function loadRandomModels(
  scene,
  modelUrl,
  count = 10,
  radius = 3,
  multipliers = { x: 1, y: 0.5, z: 1 },
  scaleMult = 1
) {
  const loader = new GLTFLoader();

  // === проверка кэша ===
  let gltf;
  if (modelCache.has(modelUrl)) {
    gltf = modelCache.get(modelUrl);
  } else {
    gltf = await loader.loadAsync(modelUrl);
    modelCache.set(modelUrl, gltf);
  }

  for (let i = 0; i < count; i++) {
    const clone = gltf.scene.clone(true);

    // случайные координаты
    const x = (Math.random() - 0.5) * radius * 2 * multipliers.x;
    const y = (Math.random() - 0.5) * radius * multipliers.y;
    const z = (Math.random() - 0.5) * radius * 2 * multipliers.z;

    clone.position.set(x, y, z);
    clone.rotation.y = Math.random() * Math.PI * 2;

    // масштаб
    const s = scaleMult * (0.8 + Math.random() * 0.4);
    clone.scale.set(s, s, s);

    scene.add(clone);
  }
}