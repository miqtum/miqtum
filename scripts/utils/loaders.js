// loaders.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Универсальный загрузчик GLTF/GLB моделей с PBR-текстурами.
 * 
 * Автоматически определяет формат (.gltf / .glb),
 * подгружает карты (basecolor, normal, roughness, metallic, emissive, ao, displacement)
 * и корректно применяет их к оригинальному материалу модели.
 * 
 * @param {Object} options
 * @param {string} options.name - имя модели (без расширения)
 * @param {string} options.modelPath - путь к папке модели
 * @param {THREE.Scene} options.scene - сцена для добавления
 * @param {number[]} [options.position=[0,0,0]]
 * @param {number[]} [options.rotation=[0,0,0]]
 * @param {number[]} [options.scale=[1,1,1]]
 * @returns {Promise<THREE.Group>} - возвращает загруженный объект
 */
export async function loadModelWithPBR({
  name,
  modelPath,
  scene,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}) {
  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();

  // --- список возможных карт ---
  const maps = {
    basecolor: `${modelPath}/tex/${name}_BaseColor.png`,
    normal: `${modelPath}/tex/${name}_Normal.png`,
    roughness: `${modelPath}/tex/${name}_Roughness.png`,
    metallic: `${modelPath}/tex/${name}_Metallic.png`,
    emissive: `${modelPath}/tex/${name}_Emissive.png`,
    ao: `${modelPath}/tex/${name}_AO.png`,
    displacement: `${modelPath}/tex/${name}_Displacement.png`,
  };

  const materialMaps = {};

  // --- загружаем все карты (без кэширования, безопасно) ---
  for (const [key, url] of Object.entries(maps)) {
    try {
      const texture = await new Promise((resolve) => {
        texLoader.load(
          url,
          (t) => resolve(t),
          undefined,
          () => {
            console.warn(`⚠️ missing ${url}`);
            resolve(null);
          }
        );
      });

      if (texture) {
        texture.flipY = false;
        if (key === 'basecolor' || key === 'emissive') {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        materialMaps[key] = texture;
        console.log(`✅ loaded ${url}`);
      }
    } catch (err) {
      console.warn(`❌ error loading ${url}`, err);
    }
  }

  // --- автоопределение формата .gltf или .glb ---
  let modelFile = `${modelPath}/${name}.gltf`;
  try {
    const response = await fetch(modelFile, { method: 'HEAD' });
    if (!response.ok) throw new Error();
  } catch {
    modelFile = `${modelPath}/${name}.glb`;
  }

  console.log(`📦 loading model: ${modelFile}`);

  // --- загружаем модель ---
  const gltf = await loader.loadAsync(modelFile);
  const model = gltf.scene;

  model.traverse((obj) => {
    if (obj.isMesh) {
      const mat = obj.material;

      // гарантируем uv2 для aoMap
      if (obj.geometry && obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
        obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
      }

      // добавляем найденные карты
      if (materialMaps.basecolor) mat.map = materialMaps.basecolor;
      if (materialMaps.normal) mat.normalMap = materialMaps.normal;
      if (materialMaps.roughness) mat.roughnessMap = materialMaps.roughness;
      if (materialMaps.metallic) mat.metalnessMap = materialMaps.metallic;
      if (materialMaps.emissive) {
        mat.emissiveMap = materialMaps.emissive;
        mat.emissiveIntensity = 1.0;
        mat.emissive = new THREE.Color(0xffffff);
      }
      if (materialMaps.ao) mat.aoMap = materialMaps.ao;
      if (materialMaps.displacement) {
        mat.displacementMap = materialMaps.displacement;
        mat.displacementScale = 0.02;
      }

      mat.needsUpdate = true;
    }
  });

  model.position.set(...position);
  model.rotation.set(...rotation);
  model.scale.set(...scale);

  scene.add(model);
  console.log(`🧩 Model "${name}" added to scene`);
  return model;
}

/**
 * Загружает GLTF/GLB модель, применяет PBR-текстуры
 * и случайно распределяет все меши по сцене.
 * 
 * @param {Object} options
 * @param {string} options.name - имя модели (без расширения)
 * @param {string} options.modelPath - путь к папке модели
 * @param {THREE.Scene} options.scene - сцена для добавления
 * @param {Object} [options.spread={x:0,y:0,z:0}] - диапазон разброса по осям
 * @param {number} [options.innerRadius=0] - внутренняя область, куда не попадают меши
 * @param {number} [options.scale=1] - базовый масштаб
 * @param {boolean} [options.randomScale=false] - включить рандомный масштаб
 * @param {number} [options.scaleLimit=0.3] - предел изменения масштаба (например 0.3 → 0.7–1.3)
 * @param {boolean} [options.randomRotation=false] - включить рандомное вращение
 * @param {Object} [options.rotationLimits={x:0,y:360,z:0}] - лимиты по осям в градусах
 */
export async function loadMultMeshWithPBR({
  name,
  modelPath,
  scene,
  spread = { x: 0, y: 0, z: 0 },
  innerRadius = 0,
  scale = 1,
  randomScale = false,
  scaleLimit = 0.3,
  randomRotation = false,
  rotationLimits = { x: 0, y: 360, z: 0 },
}) {
  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();

  // --- карты PBR ---
  const maps = {
    basecolor: `${modelPath}/tex/${name}_BaseColor.png`,
    normal: `${modelPath}/tex/${name}_Normal.png`,
    roughness: `${modelPath}/tex/${name}_Roughness.png`,
    metallic: `${modelPath}/tex/${name}_Metallic.png`,
    emissive: `${modelPath}/tex/${name}_Emissive.png`,
    ao: `${modelPath}/tex/${name}_AO.png`,
    displacement: `${modelPath}/tex/${name}_Displacement.png`,
  };

  const materialMaps = {};

  // --- загружаем карты (без кэша) ---
  for (const [key, url] of Object.entries(maps)) {
    try {
      const texture = await new Promise((resolve) => {
        texLoader.load(
          url,
          (t) => resolve(t),
          undefined,
          () => {
            console.warn(`⚠️ missing ${url}`);
            resolve(null);
          }
        );
      });

      if (texture) {
        texture.flipY = false;
        if (key === 'basecolor' || key === 'emissive') {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        materialMaps[key] = texture;
        console.log(`✅ loaded ${url}`);
      }
    } catch (err) {
      console.warn(`❌ error loading ${url}`, err);
    }
  }

  // --- определяем формат модели ---
  let modelFile = `${modelPath}/${name}.gltf`;
  try {
    const response = await fetch(modelFile, { method: 'HEAD' });
    if (!response.ok) throw new Error();
  } catch {
    modelFile = `${modelPath}/${name}.glb`;
  }

  console.log(`📦 loading model: ${modelFile}`);
  const gltf = await loader.loadAsync(modelFile);
  const model = gltf.scene;

  // --- применяем карты и рандомное расположение ---
  model.traverse((obj) => {
    if (obj.isMesh) {
      const mat = obj.material;

      if (obj.geometry && obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
        obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
      }

      if (materialMaps.basecolor) mat.map = materialMaps.basecolor;
      if (materialMaps.normal) mat.normalMap = materialMaps.normal;
      if (materialMaps.roughness) mat.roughnessMap = materialMaps.roughness;
      if (materialMaps.metallic) mat.metalnessMap = materialMaps.metallic;
      if (materialMaps.emissive) {
        mat.emissiveMap = materialMaps.emissive;
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 1.0;
      }
      if (materialMaps.ao) mat.aoMap = materialMaps.ao;
      if (materialMaps.displacement) {
        mat.displacementMap = materialMaps.displacement;
        mat.displacementScale = 0.02;
      }

      mat.needsUpdate = true;

      // === 🎲 Рандомное размещение ===
      let x, z, dist;
      do {
        x = (Math.random() - 0.5) * 2 * spread.x;
        z = (Math.random() - 0.5) * 2 * spread.z;
        dist = Math.sqrt(x * x + z * z);
      } while (dist < innerRadius);

      const y = (Math.random() - 0.5) * 2 * spread.y;
      obj.position.set(x, y, z);

      // === 🔄 Рандомное вращение ===
      if (randomRotation) {
        const deg2rad = (d) => (d * Math.PI) / 180;
        const rx = deg2rad((Math.random() - 0.5) * rotationLimits.x * 2);
        const ry = deg2rad((Math.random() - 0.5) * rotationLimits.y * 2);
        const rz = deg2rad((Math.random() - 0.5) * rotationLimits.z * 2);
        obj.rotation.set(rx, ry, rz);
      }

      // === 🔍 Масштаб ===
      let s = scale;
      if (randomScale) {
        const factor = 1 + (Math.random() * 2 - 1) * scaleLimit;
        s *= factor;
      }
      obj.scale.setScalar(s);

      scene.add(obj.clone());
    }
  });

  console.log(`🧩 Model "${name}" meshes distributed in scene`);
  return model;
}


/**
 * Загружает несколько копий модели с PBR в случайных позициях вокруг центра.
 * 
 * @param {Object} options
 * @param {string} options.name - имя модели
 * @param {string} options.modelPath - путь к папке модели
 * @param {THREE.Scene} options.scene - сцена
 * @param {number} [options.count=10] - количество экземпляров
 * @param {Object} [options.spread={x:10,y:0,z:10}] - разброс по осям X/Y/Z
 * @param {number} [options.innerRadius=0] - внутренний радиус (зона, куда не спавнить)
 * @param {number} [options.scale=1] - базовый масштаб
 * @param {boolean|Object} [options.randomScale=false] - включить рандомный масштаб (true или {limit:0.3})
 * @param {boolean} [options.randomRotation=false] - включить случайное вращение
 * @param {Object} [options.rotationLimits={x:0,y:360,z:0}] - лимиты вращения в градусах
 */
export async function loadScatteredInstances({
  name,
  modelPath,
  scene,
  count = 10,
  spread = { x: 10, y: 0, z: 10 },
  innerRadius = 0,
  scale = 1,
  randomScale = false, // true или { limit: 0.3 }
  randomRotation = false,
  rotationLimits = { x: 0, y: 360, z: 0 },
}) {
  // определяем лимит для масштаба
  const scaleLimit = typeof randomScale === 'object' && randomScale.limit ? randomScale.limit : 0.25;

  for (let i = 0; i < count; i++) {
    // Случайная точка в пределах разброса
    let x, y, z, dist;
    do {
      x = (Math.random() - 0.5) * 2 * spread.x;
      z = (Math.random() - 0.5) * 2 * spread.z;
      dist = Math.sqrt(x * x + z * z);
    } while (dist < innerRadius); // проверка внутреннего радиуса

    y = (Math.random() - 0.5) * 2 * spread.y;

    // Рандомный масштаб
    const scaleValue = randomScale
      ? scale * (1 + (Math.random() - 0.5) * 2 * scaleLimit)
      : scale;

    // Рандомное вращение в градусах → радианы
    const degToRad = (deg) => (deg * Math.PI) / 180;
    const rotation = randomRotation
      ? [
          degToRad((Math.random() - 0.5) * 2 * rotationLimits.x),
          degToRad((Math.random() - 0.5) * 2 * rotationLimits.y),
          degToRad((Math.random() - 0.5) * 2 * rotationLimits.z),
        ]
      : [0, 0, 0];

    // Загружаем экземпляр
    await loadModelWithPBR({
      name,
      modelPath,
      position: [x, y, z],
      rotation,
      scale: [scaleValue, scaleValue, scaleValue],
      scene,
    });
  }

  console.log(
    `✅ Cluster "${name}" loaded (${count} models, spread=${JSON.stringify(spread)}, innerRadius=${innerRadius}, randomScale=${!!randomScale}, randomRotation=${!!randomRotation})`
  );
}
