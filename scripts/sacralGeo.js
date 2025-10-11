import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

let camera, controls, scene, renderer;
let composer, outlinePass;

// ÑÐ¾ÑÑ‚Ð¾ÑÐ½Ð¸Ðµ Ð°Ð½Ð¸Ð¼Ð°Ñ†Ð¸Ð¸ ÐºÐ°Ð¼ÐµÑ€Ñ‹
let camTween = null;
let homeView = null

// Ð²Ñ€ÐµÐ¼Ñ Ð´Ð»Ñ Ð´ÐµÐ»ÑŒÑ‚Ñ‹
let lastTime = performance.now();

const container = document.querySelector('.three_bg');

const TARGET_SIZE_DEFAULT = 1.0;

const MODELS = [
  { url: '/miqtum/models/SCOOF.glb', pos: [ 0, 4, 0], rot: [0, 0, 0], size: 3 },
  { url: '/miqtum/models/GLOCK.glb', pos: [-4, 0, 0], rot: [0, Math.PI * 0.5, 0], size: 1.0 },
  { url: '/miqtum/models/eidos1.glb', pos: [ 0, -4, 0], rot: [0, 0.25*Math.PI, 0], size: 3 },
  { url: '/miqtum/models/SCOOF.glb', pos: [ 4, 0, 0], rot: [0, -0.5*Math.PI, 0], size: 1.2 },
];

// ÐÐ°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸ Ð¿Ð¾Ð´Ð»ÐµÑ‚Ð° Ðº Ð¼Ð¾Ð´ÐµÐ»ÑÐ¼
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

// Ð¡ÐºÐ¾Ñ€Ð¾ÑÑ‚Ð¸ Ð²Ñ€Ð°Ñ‰ÐµÐ½Ð¸Ñ Ð¼Ð¾Ð´ÐµÐ»ÐµÐ¹ (Ñ€Ð°Ð´Ð¸Ð°Ð½/ÑÐµÐº). ÐœÐ¾Ð¶Ð½Ð¾ Ð·Ð°Ð´Ð°Ð²Ð°Ñ‚ÑŒ Ð¾Ñ‚Ñ€Ð¸Ñ†Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ Ð´Ð»Ñ Ñ€Ð°Ð·Ð½Ð¾Ð½Ð°Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð½Ð¾Ð³Ð¾ Ð²Ñ€Ð°Ñ‰ÐµÐ½Ð¸Ñ.
const DEFAULT_MODEL_ROT_SPEED = 0.15;
const MODEL_ROT_SPEEDS = [0.15, -0.12, 0.1, 0.13];

// Ð¥Ñ€Ð°Ð½Ð¸Ð»Ð¸Ñ‰Ðµ Ð·Ð°Ð³Ñ€ÑƒÐ¶ÐµÐ½Ð½Ñ‹Ñ… Ð¼Ð¾Ð´ÐµÐ»ÐµÐ¹
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

// --- Ð¤ÐžÐ Ð¡ Ð¢Ð•ÐšÐ¡Ð¢Ð£Ð ÐžÐ™ ---
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/miqtum/static/abstract.jpg', (textureEquirec) => {
  textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
  textureEquirec.colorSpace = THREE.SRGBColorSpace;
  
  // --- Ð—Ð°Ð¼ÐµÐ½ÑÐµÐ¼ Ñ„Ð¾Ð½ Ð½Ð° Ñ€ÐµÐ°Ð»ÑŒÐ½Ñ‹Ð¹ Ð¾Ð±ÑŠÐµÐºÑ‚ ---
  const skyGeo = new THREE.SphereGeometry(55, 60, 40);
  skyGeo.scale(1, 1, 1);

  const skyMat = new THREE.MeshStandardMaterial({
  map: textureEquirec,
  side: THREE.BackSide,
  toneMapped: true 
});

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

// Ð²ÑÑ‘ ÐµÑ‰Ñ‘ Ð¼Ð¾Ð¶Ð½Ð¾ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÑŒ Ð¾ÐºÑ€ÑƒÐ¶ÐµÐ½Ð¸Ðµ Ð´Ð»Ñ Ð¾ÑÐ²ÐµÑ‰ÐµÐ½Ð¸Ñ
  scene.environment = textureEquirec;
  
});


  renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // --- POSTPROCESSING (Outline) ---
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
  outlinePass.edgeStrength = 4.0;
  outlinePass.edgeGlow = 3;
  outlinePass.edgeThickness = 6;
  outlinePass.pulsePeriod = 2.5;
  outlinePass.visibleEdgeColor.set(0xff6c6c);
  outlinePass.hiddenEdgeColor.set(0x000000);
  composer.addPass(outlinePass);
    

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;   // Ð±ÐµÐ· Ð¿Ð°Ð½Ð¾Ñ€Ð°Ð¼Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ñ
  controls.enableZoom = false;  // Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð²Ñ€Ð°Ñ‰ÐµÐ½Ð¸Ðµ
  controls.minDistance = 0.0;
  controls.maxDistance = 100.0;
  controls.target.set(0, 0, -1);

  const dir1 = new THREE.DirectionalLight(0xffffff, 12);
  dir1.position.set(2, 2, 2);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0x44fcff, 3);
  dir2.position.set(-2, -2, -2);
  scene.add(dir2);

  scene.add(new THREE.AmbientLight(0xff00ff, 6));

  addModelsFromConfig(MODELS);
  
  // Ð’Ñ‹Ñ‡Ð¸ÑÐ»ÑÐµÐ¼ Ð¸ Ð·Ð°Ð¿ÑƒÑÐºÐ°ÐµÐ¼ Ð¿Ð»Ð°Ð²Ð½Ñ‹Ð¹ Ð¿Ð¾Ð´Ð»ÐµÑ‚ Ðº "Home"
  setTimeout(() => {
    homeView = computeHomeView();
    if (homeView) {
      // Ð½Ð°Ñ‡Ð½ÐµÐ¼ Ñ‡ÑƒÑ‚ÑŒ Ð±Ð»Ð¸Ð¶Ðµ Ðº Ñ†ÐµÐ½Ñ‚Ñ€Ñƒ â€” Ð´Ð»Ñ ÑÑ„Ñ„ÐµÐºÑ‚Ð° Ð¿Ñ€Ð¸Ð±Ð»Ð¸Ð¶ÐµÐ½Ð¸Ñ
      const startPos = homeView.target.clone().add(
        homeView.pos.clone().sub(homeView.target).multiplyScalar(0.3)
      );

      camera.position.copy(startPos);
      controls.target.copy(homeView.target);

      // Ð¿Ð»Ð°Ð²Ð½Ñ‹Ð¹ Ð¿Ð¾Ð´Ð»ÐµÑ‚ (zoom-in)
      flyTo({
        pos: homeView.pos,
        target: homeView.target,
        duration: 2.0 // ÑÐµÐºÑƒÐ½Ð´Ð°-Ð¿Ð¾Ð»Ñ‚Ð¾Ñ€Ñ‹ â€” ÐºÑ€Ð°ÑÐ¸Ð²Ð¾
      });
    }
  }, 800); // Ð½ÐµÐ±Ð¾Ð»ÑŒÑˆÐ°Ñ Ð·Ð°Ð´ÐµÑ€Ð¶ÐºÐ°, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð¼Ð¾Ð´ÐµÐ»Ð¸ ÑƒÑÐ¿ÐµÐ»Ð¸ Ð¾Ñ‚Ñ€Ð¸ÑÐ¾Ð²Ð°Ñ‚ÑŒÑÑ


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
    loadedModels[i] = obj; // ÑÐ¾Ñ…Ñ€Ð°Ð½Ð¸Ð¼ ÑÑÑ‹Ð»ÐºÑƒ
  }
}

async function loadAndPrepareModel(url, targetSize = TARGET_SIZE_DEFAULT) {
  try {
    const gltf = await gltfLoader.loadAsync(url);
    const root = gltf.scene || gltf.scenes?.[0];
    if (!root) throw new Error('GLTF: scene Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð°');

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(root);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      root.userData.mixer = mixer; // ÑÐ¾Ñ…Ñ€Ð°Ð½Ð¸Ð¼ Ð´Ð»Ñ animate()
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
    console.error('ÐžÑˆÐ¸Ð±ÐºÐ° Ð·Ð°Ð³Ñ€ÑƒÐ·ÐºÐ¸ GLTF:', url, e);
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

  object3D.position.sub(center); // Ñ†ÐµÐ½Ñ‚Ñ€ Ð² (0,0,0)

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  object3D.scale.setScalar(scale);
}

// Ð’Ñ‹Ñ‡Ð¸ÑÐ»ÐµÐ½Ð¸Ðµ Ñ€Ð°ÑÑÑ‚Ð¾ÑÐ½Ð¸Ñ Ð´Ð¾ ÐºÐ°Ð¼ÐµÑ€Ñ‹, Ñ‡Ñ‚Ð¾Ð±Ñ‹ ÑƒÐ¼ÐµÑÑ‚Ð¸Ñ‚ÑŒ ÑÑ„ÐµÑ€Ñƒ Ñ€Ð°Ð´Ð¸ÑƒÑÐ° r Ð² ÐºÐ°Ð´Ñ€Ðµ
function getFitDistanceForRadius(r) {
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * camera.aspect);
  const distV = r / Math.tan(vFOV / 2);
  const distH = r / Math.tan(hFOV / 2);
  return Math.max(distV, distH);
}

// ÐŸÐ¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ñ†ÐµÐ½Ñ‚Ñ€ Ð¸ Ñ€Ð°Ð´Ð¸ÑƒÑ Ð¼Ð¾Ð´ÐµÐ»Ð¸ (Ð² Ð¼Ð¸Ñ€Ð¾Ð²Ñ‹Ñ… ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð°Ñ…)
function getModelBounds(model) {
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius || 1;
  return { center, radius };
}

function computeHomeView() {
  const objs = loadedModels.filter(Boolean);
  if (objs.length === 0) return null;

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

  return { pos, target: center, radius: r };
}

// ÐŸÐµÑ€ÐµÐ»ÐµÑ‚ Ðº Ð¾Ð±Ñ‰ÐµÐ¹ ÑÑ†ÐµÐ½Ðµ
function flyToHome() {
  if (!homeView) homeView = computeHomeView();
  if (!homeView) return;

  flyTo({ pos: homeView.pos, target: homeView.target, duration: 1.4 });
  infoPopup.classList.remove('visible');
  document.querySelectorAll('.ui').forEach(el => el.style.display = '');
  outlinePass.selectedObjects = [];
}

// ÐŸÐµÑ€ÐµÐ»ÐµÑ‚ Ðº ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ð¾Ð¹ Ð¼Ð¾Ð´ÐµÐ»Ð¸ Ð¿Ð¾ Ð¸Ð½Ð´ÐµÐºÑÑƒ
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
const uiPanel = document.querySelector('.ui'); // ÐºÐ¾Ð½Ñ‚ÐµÐ¹Ð½ÐµÑ€ Ñ ÐºÐ½Ð¾Ð¿ÐºÐ°Ð¼Ð¸

const clickSound = new Audio('/miqtum/static/trans.wav'); // ÑƒÐºÐ°Ð¶Ð¸ Ð¿ÑƒÑ‚ÑŒ Ðº Ð·Ð²ÑƒÐºÑƒ
clickSound.volume = 0;

function showModelInfo(index) {
  if (!MODEL_INFOS[index]) return;
  clearTimeout(popupTimeout);

  lastUIButton = document.activeElement?.closest('button');

  // Ð¿Ð»Ð°Ð²Ð½Ð¾Ðµ Ð¸ÑÑ‡ÐµÐ·Ð½Ð¾Ð²ÐµÐ½Ð¸Ðµ Ð¿Ð°Ð½ÐµÐ»Ð¸
  if (uiPanel) uiPanel.classList.add('hidden');

  infoText.textContent = MODEL_INFOS[index];
  infoPopup.classList.add('visible');
}

function hideModelInfo() {
  infoPopup.classList.remove('visible');

  // Ð¿Ð»Ð°Ð²Ð½Ð¾Ðµ Ð¿Ð¾ÑÐ²Ð»ÐµÐ½Ð¸Ðµ Ð¿Ð°Ð½ÐµÐ»Ð¸
  if (uiPanel) {
    uiPanel.classList.remove('hidden');
  }

  if (lastUIButton) lastUIButton.focus();
}

function highlightModel(model) {
  if (!model) return;
  outlinePass.selectedObjects = [model];
}

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

// Ð£Ð½Ð¸Ð²ÐµÑ€ÑÐ°Ð»ÑŒÐ½Ð°Ñ Ñ„ÑƒÐ½ÐºÑ†Ð¸Ñ Ð¿ÐµÑ€ÐµÐ»ÐµÑ‚Ð°
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

// ÐžÐ±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ð²Ñ€Ð°Ñ‰ÐµÐ½Ð¸Ñ Ð¼Ð¾Ð´ÐµÐ»ÐµÐ¹
function updateModelsRotation(deltaSec) {
  for (let i = 0; i < loadedModels.length; i++) {
    const obj = loadedModels[i];
    if (!obj) continue;
    const speed = MODEL_ROT_SPEEDS[i] ?? DEFAULT_MODEL_ROT_SPEED; // Ñ€Ð°Ð´/ÑÐµÐº
    obj.rotation.y += speed * deltaSec;
  }
}

function onWindowResize() {
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }  
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
    
  // Ð¿Ð¾Ñ‚Ð¾Ð¼ Ñ€ÐµÐ½Ð´ÐµÑ€ Ð¾ÑÐ½Ð¾Ð²Ð½Ð¾Ð¹ ÑÑ†ÐµÐ½Ñ‹ Ñ ÑÑ„Ñ„ÐµÐºÑ‚Ð°Ð¼Ð¸
  composer.render();

}