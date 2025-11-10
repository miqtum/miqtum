import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Глобальные кэши --- //
const textureCache = new Map();
const materialCache = new Map();
const modelCache = new Map();

/**
 * Загружает glTF модель с PBR и возвращает готовую THREE.Group.
 * Все текстуры и материалы кэшируются, чтобы не грузить заново.
 */
async function loadModelWithPBR_Cached(name, modelPath) {
  const cacheKey = `${modelPath}/${name}`;
  if (modelCache.has(cacheKey)) return modelCache.get(cacheKey).clone(true);

  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();

  // список возможных текстур
  const texNames = ['BaseColor', 'Normal', 'Roughness', 'Metallic', 'Emissive', 'AO', 'Displacement'];
  const tex = {};

  for (const t of texNames) {
    const url = `${modelPath}/tex/${name}_${t}.png`;
    if (textureCache.has(url)) {
      tex[t] = textureCache.get(url);
      continue;
    }
    try {
      const loaded = await new Promise((resolve) =>
        texLoader.load(url, (t) => resolve(t), undefined, () => resolve(null))
      );
      if (loaded) {
        loaded.flipY = false;
        if (t === 'BaseColor' || t === 'Emissive') loaded.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(url, loaded);
        tex[t] = loaded;
      }
    } catch {
      tex[t] = null;
    }
  }

  // определяем формат файла
  let modelFile = `${modelPath}/${name}.gltf`;
  try {
    const res = await fetch(modelFile, { method: 'HEAD' });
    if (!res.ok) modelFile = `${modelPath}/${name}.glb`;
  } catch {
    modelFile = `${modelPath}/${name}.glb`;
  }

  const gltf = await loader.loadAsync(modelFile);
  const model = gltf.scene;

  model.traverse((obj) => {
    if (!obj.isMesh) return;
    const matKey = `${cacheKey}_mat`;

    let mat;
    if (materialCache.has(matKey)) {
      mat = materialCache.get(matKey).clone();
    } else {
      mat = obj.material.clone();
      if (obj.geometry && obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
        obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
      }

      if (tex.BaseColor) mat.map = tex.BaseColor;
      if (tex.Normal) mat.normalMap = tex.Normal;
      if (tex.Roughness) mat.roughnessMap = tex.Roughness;
      if (tex.Metallic) mat.metalnessMap = tex.Metallic;
      if (tex.Emissive) {
        mat.emissiveMap = tex.Emissive;
        mat.emissiveIntensity = 1;
        mat.emissive = new THREE.Color(0xffffff);
      }
      if (tex.AO) mat.aoMap = tex.AO;
      if (tex.Displacement) {
        mat.displacementMap = tex.Displacement;
        mat.displacementScale = 0.02;
      }
      mat.needsUpdate = true;
      materialCache.set(matKey, mat);
    }

    obj.material = mat;
  });

  modelCache.set(cacheKey, model);
  return model.clone(true);
}

/**
 * Загружает несколько копий модели с PBR в случайных позициях вокруг центра.
 * Автоматически рассчитывает минимальную дистанцию между моделями по bounding box.
 * 
 * @param {Object} options
 * @param {string} options.name - имя модели
 * @param {string} options.modelPath - путь к папке модели
 * @param {THREE.Scene} options.scene - сцена
 * @param {number} [options.count=10] - количество экземпляров
 * @param {Object} [options.spread={x:10,y:0,z:10}] - разброс по осям X/Y/Z
 * @param {number} [options.innerRadius=0] - внутренняя зона, куда не спавнить
 * @param {number} [options.scale=1] - базовый масштаб
 * @param {boolean|Object} [options.randomScale=false] - включить рандомный масштаб (true или {limit:0.3})
 * @param {boolean} [options.randomRotation=false] - включить случайное вращение
 * @param {Object} [options.rotationLimits={x:0,y:360,z:0}] - лимиты вращения в градусах
 * @param {number} [options.minDistance] - минимальная дистанция между объектами (опционально)
 */
export async function loadModelsCluster({
  name,
  modelPath,
  scene,
  count = 10,
  spread = { x: 10, y: 0, z: 10 },
  innerRadius = 0,
  scale = 1,
  randomScale = false,
  randomRotation = false,
  rotationLimits = { x: 0, y: 360, z: 0 },
  minDistance = null, // если не задан — вычислим автоматически
}) {
  const scaleLimit = typeof randomScale === 'object' && randomScale.limit ? randomScale.limit : 0.25;
  const degToRad = (deg) => (deg * Math.PI) / 180;

  // Загружаем базовую модель (без добавления в сцену)
  const baseModel = await loadModelWithPBR_Cached(name, modelPath);

  // --- вычисляем bounding box модели ---
  const bbox = new THREE.Box3().setFromObject(baseModel);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // если minDistance не задан — берем средний размер по X/Z и немного увеличиваем
  if (!minDistance) {
    minDistance = Math.max(size.x, size.z) * scale * 1.2;
    console.log(`📏 auto minDistance = ${minDistance.toFixed(2)}`);
  }

  const placedPositions = [];

  for (let i = 0; i < count; i++) {
    let position;
    let attempts = 0;
    const maxAttempts = 50;

    // Ищем позицию, которая не слишком близко к другим
    do {
      attempts++;
      const x = (Math.random() - 0.5) * 2 * spread.x;
      const z = (Math.random() - 0.5) * 2 * spread.z;
      const y = (Math.random() - 0.5) * 2 * spread.y;
      const distFromCenter = Math.sqrt(x * x + z * z);

      if (distFromCenter < innerRadius) continue;

      position = new THREE.Vector3(x, y, z);
    } while (
      position &&
      placedPositions.some(p => p.distanceTo(position) < minDistance) &&
      attempts < maxAttempts
    );

    if (attempts >= maxAttempts) {
      console.warn(`⚠️ Не удалось найти место для объекта ${i + 1}`);
      continue;
    }

    placedPositions.push(position);

    const scaleValue = randomScale
      ? scale * (1 + (Math.random() - 0.5) * 2 * scaleLimit)
      : scale;

    const rotation = randomRotation
      ? [
        degToRad((Math.random() - 0.5) * 2 * rotationLimits.x),
        degToRad((Math.random() - 0.5) * 2 * rotationLimits.y),
        degToRad((Math.random() - 0.5) * 2 * rotationLimits.z),
      ]
      : [0, 0, 0];

    const clone = baseModel.clone(true);
    clone.position.copy(position);
    clone.rotation.set(...rotation);
    clone.scale.set(scaleValue, scaleValue, scaleValue);
    scene.add(clone);
  }

  console.log(
    `✅ Cluster "${name}" loaded (${count} models, autoMinDist=${minDistance.toFixed(2)})`
  );
}
