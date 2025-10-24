import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

let camera, controls, scene, renderer;
let composer, outlinePass;

// состояние анимации камеры
let camTween = null;
let homeView = null;

// время для дельты
let lastTime = performance.now();

const container = document.querySelector('.three_bg');

const TARGET_SIZE_DEFAULT = 1.0;

const MODELS = [
    { url: '/miqtum/models/SCOOF.glb', pos: [0, 4, 0], rot: [0, 0, 0], size: 3 },
    { url: '/miqtum/models/GLOCK.glb', pos: [-4, 0, 0], rot: [0, Math.PI * 0.5, 0], size: 1.0 },
    { url: '/miqtum/models/eidos.glb', pos: [0, -4, 0], rot: [0, 0.25 * Math.PI, 0], size: 3 },
    { url: '/miqtum/models/SCOOF.glb', pos: [4, 0, 0], rot: [0, -0.5 * Math.PI, 0], size: 1.2 },
];

// Настройки подлёта к моделям
const MODEL_VIEWS = [
    { dir: [1.0, 0.3, 1.0], distFactor: 1.3, duration: 1.2 },
    { dir: [-1.2, 0.4, 0.8], distFactor: 1.3, duration: 1.2 },
    { dir: [0.6, 0.6, 1.2], distFactor: 1.4, duration: 1.3 },
    { dir: [-0.8, 0.5, 1.0], distFactor: 1.3, duration: 1.2 },
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

    // --- ФОН С ТЕКСТУРОЙ ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/miqtum/static/Sci-FiHDRIgen.jpg', (textureEquirec) => {
        textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
        textureEquirec.colorSpace = THREE.SRGBColorSpace;

        // --- Заменяем фон на реальный объект ---
        const skyGeo = new THREE.SphereGeometry(55, 60, 40);
        skyGeo.scale(1, 1, 1);

        const skyMat = new THREE.MeshStandardMaterial({
            map: textureEquirec,
            side: THREE.BackSide,
            toneMapped: true
        });

        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        scene.add(skyMesh);

        // всё ещё можно использовать окружение для освещения
        scene.environment = textureEquirec;

    });


    renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

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
    controls.enablePan = false;   // без панорамирования
    controls.enableZoom = false;  // только вращение
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

    // Вычисляем и запускаем плавный подлёт к "Home"
    setTimeout(() => {
        homeView = computeHomeView();
        if (homeView) {
            // начнём чуть ближе к центру — для эффекта приближения
            const startPos = homeView.target.clone().add(
                homeView.pos.clone().sub(homeView.target).multiplyScalar(0.3)
            );

            camera.position.copy(startPos);
            controls.target.copy(homeView.target);

            // плавный подлёт (zoom-in)
            flyTo({
                pos: homeView.pos,
                target: homeView.target,
                duration: 2.0 // секунда-полторы — красиво
            });
        }
    }, 800); // небольшая задержка, чтобы модели успели отрисоваться


    setupUI();

    window.addEventListener('resize', onWindowResize);
}

function setupUI() {
    bindBtn('btn-home', () => flyToHome());
    bindBtn('btn-m0', () => flyToModel(0));
    bindBtn('btn-m1', () => flyToModel(1));
    bindBtn('btn-m2', () => flyToModel(2));
    bindBtn('btn-m3', () => flyToModel(3));
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
        if (!root) throw new Error('GLTF: сцена не найдена');

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
    const dir = new THREE.Vector3(0, 0.5, 2).normalize();
    const pos = center.clone().add(dir.multiplyScalar(dist));

    return { pos, target: center, radius: r };
}

// Перелёт к общей сцене
function flyToHome() {
    if (!homeView) homeView = computeHomeView();
    if (!homeView) return;

    flyTo({ pos: homeView.pos, target: homeView.target, duration: 1.4 });
    infoPopup.classList.remove('visible');
    document.querySelectorAll('.ui').forEach(el => el.style.display = '');
    outlinePass.selectedObjects = [];
}

// Перелёт к конкретной модели по индексу
function flyToModel(index) {
    const btn = document.querySelector(`#btn-m${index}`);

    // если интерфейс заблокирован или кнопка неактивна — выходим
    if (uiLocked || btn?.classList.contains('inactive') || btn?.classList.contains('pressed')) return;

    // делаем эту кнопку "нажатой", а остальные "неактивными"
    document.querySelectorAll('.ui button').forEach(b => {
        b.classList.remove('pressed', 'inactive');
        if (b !== btn) b.classList.add('inactive');
    });
    btn.classList.add('pressed');

    uiLocked = true;
    activeModelButton = btn;

    // далее оригинальный вызов flyToModel

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

// === Блокировка UI-кнопок через CSS-класс ===
function setUILocked(locked) {
    if (!uiPanel) return;
    uiPanel.classList.toggle('locked', locked);
    if (locked) {
        // оставляем только focus — ничего не blur'им
    }
}

let activeModelButton = null;
let uiLocked = false;

// Оборачиваем только flyToModel — home не трогаем
const _flyToModel = flyToModel;
flyToModel = function (index, ...args) {
    const btn = document.querySelector(`#btn-m${index}`);
    if (btn && activeModelButton === btn) return; // если уже активна — выходим
    activeModelButton = btn;

    _flyToModel.call(this, index, ...args);
    setUILocked(true);

    // помечаем активную кнопку
    if (btn) btn.classList.add('active-model');
};

// Разблокируем при клике на кнопку OK
okBtn?.addEventListener('click', () => {
    setTimeout(() => setUILocked(false), 0);
    uiLocked = false;
    if (activeModelButton) {
        activeModelButton.classList.add('pressed');
        document.querySelectorAll('.ui button').forEach(b => {
            if (b !== activeModelButton) b.classList.remove('inactive');
        });
    }
});

const clickSound = new Audio('/miqtum/static/trans.wav'); // укажи путь к звуку
clickSound.volume = 0;

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
    if (!model) return;
    outlinePass.selectedObjects = [model];
}

const oldFlyToHome = flyToHome;

flyToHome = function () {
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

    activeModelButton?.classList.remove('active-model');
    activeModelButton = null;
    if (activeModelButton) activeModelButton.classList.remove('pressed');
    document.querySelectorAll('.ui button').forEach(b => b.classList.remove('inactive'));
    if (homeBtn) {
        homeBtn.classList.add('pressed');
        activeModelButton = homeBtn;
    }
};

// Универсальная функция перелёта
function flyTo(view) {
    if (clickSound) {
        clickSound.currentTime = 0;
        clickSound.play();
    }
    const toPos = view.pos instanceof THREE.Vector3
        ? view.pos.clone()
        : new THREE.Vector3().fromArray(
            view.pos.toArray ? view.pos.toArray() : view.pos
        );
    const toTgt = view.target instanceof THREE.Vector3
        ? view.target.clone()
        : new THREE.Vector3().fromArray(
            view.target.toArray ? view.target.toArray() : view.target
        );
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

// Easing — плавная функция ускорения/замедления
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

// Обработка изменения размера окна
function onWindowResize() {
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Главный цикл анимации
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

    // потом рендер основной сцены с эффектами
    composer.render();
}
