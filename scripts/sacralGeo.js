import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, controls, scene, renderer;
let textureEquirec;

const container = document.querySelector('.three_bg');

const TARGET_SIZE_DEFAULT = 1.0;

const MODELS = [
  { url: '/scripts/miqtum/models/SCOOF.glb', pos: [ 0, 0, 8 ], rot: [0, 0, 0], size: 3 },
  { url: '/scripts/miqtum/models/GLOCK.glb', pos: [-4, 0, -4], rot: [0, Math.PI * 0.5, 0], size: 1.0 },
  { url: '/scripts/miqtum/models/SCOOF.glb', pos: [ 0, 1, -6], rot: [0, 0.25*Math.PI, 0], size: 0.8 },
  { url: '/scripts/miqtum/models/SCOOF.glb', pos: [ 4, -0.5, -5], rot: [0, -0.5*Math.PI, 0], size: 1.2 },
];

const gltfLoader = new GLTFLoader();

init();
animate();

function init() {
  scene = new THREE.Scene();

  const textureLoader = new THREE.TextureLoader();
  textureEquirec = textureLoader.load('/scripts/miqtum/static/squote.jpg', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
    scene.environment = tex;
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;   // блок панорамирования
  controls.enableZoom = false;  // оставляем только вращение
  controls.minDistance = 0.0;
  controls.maxDistance = 10.0;
  controls.target.set(0, 0, -1);

  const dir1 = new THREE.DirectionalLight(0xffffff, 3);
  dir1.position.set(1, 1, 1);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0x002288, 3);
  dir2.position.set(-1, -1, -1);
  scene.add(dir2);

  scene.add(new THREE.AmbientLight(0x555555));

  addModelsFromConfig(MODELS);

  window.addEventListener('resize', onWindowResize);
}

async function addModelsFromConfig(list) {
  for (const m of list) {
    const obj = await loadAndPrepareModel(m.url, m.size ?? TARGET_SIZE_DEFAULT);
    if (!obj) continue;

    if (Array.isArray(m.pos)) {
      obj.position.set(m.pos[0], m.pos[1], m.pos[2]);
    } else if (m.pos instanceof THREE.Vector3) {
      obj.position.copy(m.pos);
    }

    if (m.rot) {
      if (Array.isArray(m.rot)) obj.rotation.set(m.rot[0], m.rot[1], m.rot[2]);
      else if (m.rot instanceof THREE.Euler) obj.rotation.copy(m.rot);
    }

    scene.add(obj);
  }
}

async function loadAndPrepareModel(url, targetSize = TARGET_SIZE_DEFAULT) {
  try {
    const gltf = await gltfLoader.loadAsync(url);
    const root = gltf.scene || gltf.scenes?.[0];
    if (!root) throw new Error('GLTF: scene не найдена');

    root.traverse((c) => {
      if (c.isMesh) {
        if (c.material && c.material.map && 'colorSpace' in c.material.map) {
          c.material.map.colorSpace = THREE.SRGBColorSpace;
        }
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    centerAndNormalize(root, targetSize);
    return root;
  } catch (e) {
    console.error('Ошибка загрузки GLTF:', url, e);
    return null;
  }
}

function centerAndNormalize(object3D, targetSize = 1.0) {
  object3D.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  object3D.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  object3D.scale.setScalar(scale);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
