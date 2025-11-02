// loader.js
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