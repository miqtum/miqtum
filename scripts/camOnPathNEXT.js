import * as THREE from 'three';
import * as Curves from 'three/addons/curves/CurveExtras.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector('.three_bg');

let scene, renderer, splineCamera, tubeGeometry, mesh;

// Векторы
const direction = new THREE.Vector3();
const binormal = new THREE.Vector3();
const normal = new THREE.Vector3();
const position = new THREE.Vector3();
const lookAt = new THREE.Vector3();

// Параметры
const SCALE = 4;
const EXTRUSION_SEGMENTS = 200;
const RADIUS = 2;
const RADIUS_SEGMENTS = 8;
const CLOSED = true;
const OFFSET = 15; // смещение камеры наружу от трубки вдоль нормали
const TUBE_WORLD_RADIUS = RADIUS * SCALE;

// Состояние пошагового перемещения
let currentIndex = 0;
let currentT = 0;
let move = {
  active: false,
  from: 0,
  to: 0,
  delta: 0,
  start: 0,
  duration: 2000,
  targetIndex: 0
};

// Модели на кривой — замените пути на свои локальные файлы
const modelsOnCurve = [
  { url: './models/SCOOF.glb', t: 0.00, size: 2 },
  { url: './models/SCOOF.glb', t: 0.33, size: 2 },
  { url: './models/SCOOF.glb', t: 0.66, size: 2 }
];

// Утилиты
function mod1(x) {
  return (x % 1 + 1) % 1;
}
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

init();

function init() {
  // Сцена
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Свет
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(0, 0, 1);
  scene.add(dir);

  // Камера
  splineCamera = new THREE.PerspectiveCamera(84, window.innerWidth / window.innerHeight, 0.01, 1000);

  // Кривая TorusKnot и трубка
  const curve = new Curves.TorusKnot(20);
  tubeGeometry = new THREE.TubeGeometry(curve, EXTRUSION_SEGMENTS, RADIUS, RADIUS_SEGMENTS, CLOSED);

  const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
  const wire = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, wireframe: true, transparent: true });

  mesh = new THREE.Mesh(tubeGeometry, material);
  mesh.add(new THREE.Mesh(tubeGeometry, wire));
  mesh.scale.set(SCALE, SCALE, SCALE);
  scene.add(mesh);

  // Loader и размещение моделей
  const gltfLoader = new GLTFLoader();

  function getFrameAt(t) {
    const c = tubeGeometry.parameters.path;
    const pos = new THREE.Vector3();
    const tan = new THREE.Vector3();

    c.getPointAt(t, pos);
    pos.multiplyScalar(SCALE);

    const segments = tubeGeometry.tangents.length;
    const pickt = t * segments;
    const i = Math.floor(pickt);
    const iNext = (i + 1) % segments;

    const bin = new THREE.Vector3().copy(tubeGeometry.binormals[i]).lerp(tubeGeometry.binormals[iNext], pickt - i);
    c.getTangentAt(t, tan);
    const nor = new THREE.Vector3().copy(bin).cross(tan).normalize();

    return { pos, tan, nor, bin };
  }

  function placeObjectOnCurve(object, t, offsetWorld = TUBE_WORLD_RADIUS + 2) {
    const { pos, tan, nor } = getFrameAt(t);
    const p = pos.clone().add(nor.clone().multiplyScalar(offsetWorld));
    const target = p.clone().add(tan);
    const m = new THREE.Matrix4().lookAt(p, target, nor);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);

    object.position.copy(p);
    object.quaternion.copy(q);
  }

  function fitToSize(object3D, targetSize = 2) {
    const box = new THREE.Box3().setFromObject(object3D);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = targetSize / maxDim;
    object3D.scale.multiplyScalar(s);
  }

  async function loadAndPlaceModel({ url, t, size = 2, offset = TUBE_WORLD_RADIUS + 2 }) {
    const gltf = await gltfLoader.loadAsync(url);
    const obj = gltf.scene || gltf.scenes[0];
    obj.traverse((c) => {
        if (c.isMesh) {
          if (c.material?.map) c.material.map.colorSpace = THREE.SRGBColorSpace;
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
  
      fitToSize(obj, size);
      placeObjectOnCurve(obj, t, offset);
      scene.add(obj);
      return obj;
    }
  
    // Загружаем модели
    Promise.all(modelsOnCurve.map(loadAndPlaceModel)).catch(console.error);
  
    // Начальное положение камеры — около первой модели
    currentIndex = 0;
    currentT = modelsOnCurve[0]?.t ?? 0;
    updateCameraAtT(currentT);
  
    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
  
    window.addEventListener('resize', onWindowResize);
  
    // Кнопка Next
    createNextButton();
  
    // Запуск цикла
    renderer.setAnimationLoop(animate);
  }
  
  function updateCameraAtT(t) {
    // Положение на кривой
    tubeGeometry.parameters.path.getPointAt(t, position);
    position.multiplyScalar(SCALE);
  
    // Интерполяция бинормали
    const segments = tubeGeometry.tangents.length;
    const pickt = t * segments;
    const pick = Math.floor(pickt);
    const pickNext = (pick + 1) % segments;
  
    binormal.subVectors(tubeGeometry.binormals[pickNext], tubeGeometry.binormals[pick]);
    binormal.multiplyScalar(pickt - pick).add(tubeGeometry.binormals[pick]);
  
    // Тангенс и нормаль
    tubeGeometry.parameters.path.getTangentAt(t, direction);
    normal.copy(binormal).cross(direction);
  
    // Смещение камеры наружу от трубки
    const camPos = position.clone().add(normal.clone().multiplyScalar(OFFSET));
  
    // Позиция/ориентация камеры (lookAhead: false)
    splineCamera.position.copy(camPos);
    lookAt.copy(camPos).add(direction);
    splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
    splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);
  }
  
  function startMoveToIndex(nextIndex) {
    if (move.active || modelsOnCurve.length === 0) return;
    const from = currentT;
    const to = modelsOnCurve[nextIndex].t;
  
    // Двигаемся вперёд по параметру (с учётом замыкания)
    const delta = mod1(to - from);
  
    move.active = true;
    move.from = from;
    move.to = to;
    move.delta = delta;
    move.start = performance.now();
    move.duration = 2000; // мс, можно менять
    move.targetIndex = nextIndex;
  
    setNextButtonDisabled(true);
  }
  
  function animate() {
    const now = performance.now();
  
    if (move.active) {
      const p = Math.min(1, (now - move.start) / move.duration);
      const eased = easeInOutCubic(p);
      const t = mod1(move.from + move.delta * eased);
  
      updateCameraAtT(t);
  
      if (p >= 1) {
        move.active = false;
        currentT = move.to;
        currentIndex = move.targetIndex;
        setNextButtonDisabled(false);
      }
    } else {
      updateCameraAtT(currentT);
    }
  
    renderer.render(scene, splineCamera);
  }
  
  function onWindowResize() {
    splineCamera.aspect = window.innerWidth / window.innerHeight;
    splineCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // UI: кнопка Next
  let nextBtn;
  function createNextButton() {
    nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.style.position = 'fixed';
    nextBtn.style.left = '50%';
    nextBtn.style.bottom = '24px';
    nextBtn.style.transform = 'translateX(-50%)';
    nextBtn.style.padding = '10px 18px';
    nextBtn.style.fontSize = '16px';
    nextBtn.style.borderRadius = '8px';
    nextBtn.style.border = 'none';
    nextBtn.style.background = '#111';
    nextBtn.style.color = '#fff';
    nextBtn.style.cursor = 'pointer';
    nextBtn.style.zIndex = '9999';
    nextBtn.style.opacity = '0.9';
  
    nextBtn.addEventListener('mouseenter', () => (nextBtn.style.opacity = '1'));
    nextBtn.addEventListener('mouseleave', () => (nextBtn.style.opacity = '0.9'));
  
    nextBtn.addEventListener('click', () => {
      if (modelsOnCurve.length === 0) return;
      const nextIndex = (currentIndex + 1)% modelsOnCurve.length;
      startMoveToIndex(nextIndex);
    });
  
    document.body.appendChild(nextBtn);
  }
  function setNextButtonDisabled(disabled) {
    if (!nextBtn) return;
    nextBtn.disabled = disabled;
    nextBtn.style.opacity = disabled ? '0.5' : '0.9';
    nextBtn.style.cursor = disabled ? 'default' : 'pointer';
  }