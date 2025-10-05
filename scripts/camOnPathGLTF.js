import * as THREE from 'three';
import * as Curves from 'three/addons/curves/CurveExtras.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector('.three_bg');

let scene, renderer, splineCamera, tubeGeometry, mesh;

// Вспомогательные векторы
const direction = new THREE.Vector3();
const binormal = new THREE.Vector3();
const normal = new THREE.Vector3();
const position = new THREE.Vector3();
const lookAt = new THREE.Vector3();

// Параметры геометрии/движения
const SCALE = 4;
const EXTRUSION_SEGMENTS = 200;
const RADIUS = 2;
const RADIUS_SEGMENTS = 8;
const CLOSED = true;
const OFFSET = 15;           // смещение камеры от трубки вдоль нормали
const LOOP_TIME_MS = 20000;  // полный оборот за 20 секунд
const TUBE_WORLD_RADIUS = RADIUS * SCALE;

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

  // Камера, которая будет ехать по кривой
  splineCamera = new THREE.PerspectiveCamera(84, window.innerWidth / window.innerHeight, 0.01, 1000);

  // Путь TorusKnot и трубка для визуализации
  const curve = new Curves.TorusKnot(20);
  tubeGeometry = new THREE.TubeGeometry(curve, EXTRUSION_SEGMENTS, RADIUS, RADIUS_SEGMENTS, CLOSED);

  const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
  const wire = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, wireframe: true, transparent: true });

  mesh = new THREE.Mesh(tubeGeometry, material);
  mesh.add(new THREE.Mesh(tubeGeometry, wire));
  mesh.scale.set(SCALE, SCALE, SCALE);
  scene.add(mesh);

  // ====== GLTFLoader: загрузка своих моделей и размещение на кривой ======
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

  // ЗАМЕНИТЕ пути на свои локальные файлы .glb/.gltf
  const modelsOnCurve =[
    { url: './models/SCOOF.glb', t: 0.00, size: 22 },
    { url: './models/SCOOF.glb', t: 0.33, size: 22 },
    { url: './models/SCOOF.glb', t: 0.66, size: 22 },
    { url: './models/SCOOF.glb', t: 0.66, size: 22 }
  ];

  Promise.all(modelsOnCurve.map(loadAndPlaceModel)).catch(console.error);
  // ====== /GLTFLoader ======

  // Рендерер
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);
  renderer.setAnimationLoop(animate);
}

function onWindowResize() {
  splineCamera.aspect = window.innerWidth / window.innerHeight;
  splineCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(timeMs) {
  render(timeMs || performance.now());
}

function render(timeMs) {
  const t = ((timeMs % LOOP_TIME_MS) / LOOP_TIME_MS);

  tubeGeometry.parameters.path.getPointAt(t, position);
  position.multiplyScalar(SCALE);

  const segments = tubeGeometry.tangents.length;
  const pickt = t * segments;
  const pick = Math.floor(pickt);
  const pickNext = (pick + 1) % segments;

  binormal.subVectors(tubeGeometry.binormals[pickNext], tubeGeometry.binormals[pick]);
  binormal.multiplyScalar(pickt - pick).add(tubeGeometry.binormals[pick]);

  tubeGeometry.parameters.path.getTangentAt(t, direction);
  normal.copy(binormal).cross(direction);

  position.add(normal.clone().multiplyScalar(OFFSET));
  splineCamera.position.copy(position);

  lookAt.copy(position).add(direction);
  splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
  splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);

  renderer.render(scene, splineCamera);
}