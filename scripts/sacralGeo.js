import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, AnimationClip } from 'three';

let camera, controls, scene, renderer;
let textureEquirec;

// состояние анимации камеры
let camTween = null;

// время для дельты
let lastTime = performance.now();

let highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xff6c6c, transparent: true, opacity: 0.25 });
let lastHighlighted = null;

const container = document.querySelector('.three_bg');

const TARGET_SIZE_DEFAULT = 1.0;

const MODELS = [
  { url: '/miqtum/models/SCOOF.glb', pos: [ 0, 4, 0], rot: [0, 0, 0], size: 3 },
  { url: '/miqtum/models/GLOCK.glb', pos: [-4, 0, 0], rot: [0, Math.PI * 0.5, 0], size: 1.0 },
  { url: '/miqtum/models/eidos1.glb', pos: [ 0, -4, 0], rot: [0, 0.25*Math.PI, 0], size: 3 },
  { url: '/miqtum/models/SCOOF.glb', pos: [ 4, 0, 0], rot: [0, -0.5*Math.PI, 0], size: 1.2 },
];

// Настройки подлета к моделям
const MODEL_VIEWS = [
  { dir: [ 1.0,  0.3,  1.0], distFactor: 1.3, duration: 1.2 },
  { dir: [-1.2,  0.4,  0.8], distFactor: 1.3, duration: 1.2 },
  { dir: [ 0.6,  0.6,  1.2], distFactor: 1.4, duration: 1.3 },
  { dir: [-0.8,  0.5,  1.0], distFactor: 1.3, duration: 1.2 },
];

const MODEL_INFOS = [
  "SCOOF — экспериментальный объект, воплощающий идею симметрии и плавности.",
  "GLOCK — технологический символ точности и силы.",
  "EIDOS — абстрактная форма, символизирующая внутреннюю энергию.",
  "SCOOF v2 — повторное воплощение формы, но в новой плоскости."
];

// Скорости вращения моделей (радиан/сек). Можно задавать отрицательные для разнонаправленного вращения.
const DEFAULT_MODEL_ROT_SPEED = 0.15;
const MODEL_ROT_SPEEDS = [0.15, -0.12, 0.1, 0.13];

// Хранилище загруженных моделей
const loadedModels = [];

const gltfLoader = new GLTFLoader();

const infoPopup = document.createElement('div');
infoPopup.className = 'model-info';
infoPopup.innerHTML = `
  <div class="text"></div>
  <button class="ok-btn">OK</button>
`;
document.body.appendChild(infoPopup);

const infoText = infoPopup.querySelector('.text');
const okBtn = infoPopup.querySelector('.ok-btn');
okBtn.addEventListener('click', hideModelInfo);

let popupTimeout = null;
init();
animate();

function init() {
  scene = new THREE.Scene();

  const textureLoader = new THREE.TextureLoader();
  textureEquirec = textureLoader.load('/miqtum/static/squote.jpg', (tex) => {
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
  controls.enablePan = false;   // без панорамирования
  controls.enableZoom = false;  // только вращение
  controls.minDistance = 0.0;
  controls.maxDistance = 100.0;
  controls.target.set(0, 0, -1);

  const dir1 = new THREE.DirectionalLight(0xffffff, 3);
  dir1.position.set(1, 1, 1);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0x002288, 3);
  dir2.position.set(-1, -1, -1);
  scene.add(dir2);

  scene.add(new THREE.AmbientLight(0x555555));

  addModelsFromConfig(MODELS);
  setupUI();

  window.addEventListener('resize', onWindowResize);
}

function setupUI() {
  bindBtn('btn-home', () => flyToHome());
  bindBtn('btn-m0',   () => flyToModel(0));
  bindBtn('btn-m1',   () => flyToModel(1));
  bindBtn('btn-m2',   () => flyToModel(2));
  bindBtn('btn-m3',   () => flyToModel(3));
}

function bindBtn(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', handler);
}

async function addModelsFromConfig(list) {
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
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
    loadedModels[i] = obj; // сохраним ссылку
  }
}

async function loadAndPrepareModel(url, targetSize = TARGET_SIZE_DEFAULT) {
  try {
    const gltf = await gltfLoader.loadAsync(url);
    const root = gltf.scene || gltf.scenes?.[0];
    if (!root) throw new Error('GLTF: scene не найдена');

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(root);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      root.userData.mixer = mixer; // сохраним для animate()
    }

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

  object3D.position.sub(center); // центр в (0,0,0)

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  object3D.scale.setScalar(scale);
}

// Вычисление расстояния до камеры, чтобы уместить сферу радиуса r в кадре
function getFitDistanceForRadius(r) {
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * camera.aspect);
  const distV = r / Math.tan(vFOV / 2);
  const distH = r / Math.tan(hFOV / 2);
  return Math.max(distV, distH);
}

// Получить центр и радиус модели (в мировых координатах)
function getModelBounds(model) {
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius || 1;
  return { center, radius };
}

// Перелет к общей сцене
function flyToHome() {
  const objs = loadedModels.filter(Boolean);
  if (objs.length === 0) return;

  const box = new THREE.Box3();
  objs.forEach(o => box.expandByObject(o));
  const center = new THREE.Vector3();
  box.getCenter(center);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius || 2;

  const baseDist = getFitDistanceForRadius(r);
  const dist = baseDist * 1.3;
  const dir = new THREE.Vector3(-1, 0.5, 2).normalize();
  const pos = center.clone().add(dir.multiplyScalar(dist));

  flyTo({ pos, target: center, duration: 1.4 });
  infoPopup.classList.remove('visible');
  document.querySelectorAll('.ui').forEach(el => el.style.display = '');
}

// Перелет к конкретной модели по индексу
function flyToModel(index) {
  const model = loadedModels[index];
  highlightModel(model);
  if (!model) return;

  const { center, radius } = getModelBounds(model);

  const conf = MODEL_VIEWS[index] || {};
  const dirArr = conf.dir || [0, 0.5, 1];
  const dir = new THREE.Vector3().fromArray(dirArr).normalize();

  const baseDist = getFitDistanceForRadius(radius);
  const dist = baseDist * (conf.distFactor ?? 1.3);

  const pos = center.clone().add(dir.multiplyScalar(dist));
  const duration = conf.duration ?? 1.2;

  flyTo({ pos, target: center, duration });
    setTimeout(() => {
    showModelInfo(index);
  }, (conf.duration ?? 1.2) * 1000);


}

let lastUIButton = null;
const uiPanel = document.querySelector('.ui'); // контейнер с кнопками

const clickSound = new Audio('/miqtum/static/trans.wav'); // укажи путь к звуку
clickSound.volume = 0.4;

function showModelInfo(index) {
  if (!MODEL_INFOS[index]) return;
  clearTimeout(popupTimeout);

  lastUIButton = document.activeElement?.closest('button');

  // плавное исчезновение панели
  if (uiPanel) uiPanel.classList.add('hidden');

  infoText.textContent = MODEL_INFOS[index];
  infoPopup.classList.add('visible');
}

function hideModelInfo() {
  infoPopup.classList.remove('visible');

  // плавное появление панели
  if (uiPanel) {
    uiPanel.classList.remove('hidden');
  }

  if (lastUIButton) lastUIButton.focus();
}

function highlightModel(model) {
  // убрать подсветку с предыдущей
  if (lastHighlighted) {
    lastHighlighted.traverse((c) => {
      if (c.material && c.userData.originalMat) {
        c.material = c.userData.originalMat;
        delete c.userData.originalMat;
      }
    });
  }

    // добавить подсветку на новую
    model.traverse((c) => {
      if (c.isMesh && !c.userData.originalMat) {
        c.userData.originalMat = c.material;
        const clone = highlightMaterial.clone();
        clone.opacity = 0.3;
        c.material = new THREE.MeshPhongMaterial({
          color: c.userData.originalMat.color,
          emissive: new THREE.Color(0xff6c6c),
          emissiveIntensity: 0.6
        });
      }
    });
    lastHighlighted = model;
  }


// function showModelInfo(index) {
//   if (!MODEL_INFOS[index]) return;
//   clearTimeout(popupTimeout);

//   // запоминаем, какая кнопка была нажата
//   lastUIButton = document.activeElement?.closest('button');

//   // скрываем панель с кнопками
//   if (uiPanel) uiPanel.style.display = 'none';

//   infoText.textContent = MODEL_INFOS[index];
//   infoPopup.classList.add('visible');
// }

// function hideModelInfo() {
//   infoPopup.classList.remove('visible');

//   // вернуть панель кнопок
//   if (uiPanel) uiPanel.style.display = '';

//   // вернуть фокус на кнопку, если она была
//   if (lastUIButton) {
//     lastUIButton.focus();
//   }
// }

const oldFlyToHome = flyToHome;
flyToHome = function() {
  oldFlyToHome();
  infoPopup.classList.remove('visible');
  if (lastHighlighted) {
    lastHighlighted.traverse((c) => {
      if (c.material && c.userData.originalMat) {
        c.material = c.userData.originalMat;
        delete c.userData.originalMat;
      }
    });
    lastHighlighted = null;
  }
};

// Универсальная функция перелета
function flyTo(view) {
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
  const toPos = view.pos instanceof THREE.Vector3 ? view.pos.clone() : new THREE.Vector3().fromArray(view.pos.toArray ? view.pos.toArray() : view.pos);
  const toTgt = view.target instanceof THREE.Vector3 ? view.target.clone() : new THREE.Vector3().fromArray(view.target.toArray ? view.target.toArray() : view.target);
  const duration = (view.duration ?? 1.5) * 1000;

  camTween = {
    start: performance.now(),
    duration,
    fromPos: camera.position.clone(),
    fromTgt: controls.target.clone(),
    toPos,
    toTgt,
  };
}

// Easing
function easeInOutCubic(t) {
  return t < 0.5? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
}

function updateCamTween(now) {
  if (!camTween) return false;

  const t = Math.min(1, (now - camTween.start) / camTween.duration);
  const k = easeInOutCubic(t);

  const curPos = camTween.fromPos.clone().lerp(camTween.toPos, k);
  const curTgt = camTween.fromTgt.clone().lerp(camTween.toTgt, k);

  camera.position.copy(curPos);
  controls.target.copy(curTgt);
  camera.lookAt(curTgt);

  if (t >= 1) {
    controls.update();
    camTween = null;
    return false;
  }
  return true;
}

// Обновление вращения моделей
function updateModelsRotation(deltaSec) {
  for (let i = 0; i < loadedModels.length; i++) {
    const obj = loadedModels[i];
    if (!obj) continue;
    const speed = MODEL_ROT_SPEEDS[i] ?? DEFAULT_MODEL_ROT_SPEED; // рад/сек
    obj.rotation.y += speed * deltaSec;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(now) {
  requestAnimationFrame(animate);
  if (!now) now = performance.now();

  const deltaSec = (now - lastTime) / 1000;
  lastTime = now;

  const animating = updateCamTween(now);
  if (!animating) {
    controls.update();
  }

  updateModelsRotation(deltaSec);

  for (const obj of loadedModels) {
    if (obj?.userData?.mixer) {
      obj.userData.mixer.update(deltaSec);
    }
  }

  renderer.render(scene, camera);
}