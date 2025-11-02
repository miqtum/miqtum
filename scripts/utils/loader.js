import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadModelWithPBR({
  name,
  extension = 'gltf',
  modelPath,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  scene,
}) {
  const loader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();
  

  // --- список карт, которые пытаемся загрузить (по универсальной схеме) ---
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

  // --- пробуем загрузить каждую карту (если нет — просто пропускаем) ---
  for (const [key, url] of Object.entries(maps)) {
    try {
      const texture = await new Promise((resolve, reject) => {
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
          // для корректной гаммы
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        materialMaps[key] = texture;
        console.log(`✅ loaded ${url}`);
      }
    } catch (err) {
      console.warn(`❌ error loading ${url}`, err);
    }
  }

  // --- загружаем саму модель ---
  const gltf = await loader.loadAsync(`${modelPath}/${name}.${extension}`);
  const model = gltf.scene;

  model.traverse((obj) => {
    if (obj.isMesh) {
      const mat = obj.material;

      // гарантируем uv2 для aoMap
      if (obj.geometry && obj.geometry.attributes.uv && !obj.geometry.attributes.uv2) {
        obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
      }

      // добавляем найденные карты к существующему материалу
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
