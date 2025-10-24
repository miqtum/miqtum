// /miqtum/scripts/gltfParticles.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, mixer, clock, controls;
let actions = [], currentAction = 0;
let isPlaying = false;
let model = null;
let autoRotateSpeed = 0.1; // скорость вращения (градусы/сек)

init();
animate();

function init() {
    // СЦЕНА
    scene = new THREE.Scene();

    //   // ГРАДИЕНТНЫЙ ФОН
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f0f0f0'); // светлый верх
    gradient.addColorStop(1, '#000000'); // серый низ
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bgTexture = new THREE.CanvasTexture(canvas);
    scene.background = bgTexture;

    const loader2 = new GLTFLoader();
    loader2.load(
        '/miqtum/models/eidos1.glb', // вставь сюда ссылку
        (gltf2) => {
            const sphereModel = gltf2.scene;
            sphereModel.scale.set(8, 8, 8); // увеличиваем чтобы окружала сцену
            sphereModel.traverse(obj => {
                if (obj.isMesh) {
                    obj.material.wireframe = true;
                    obj.material.transparent = true;
                    obj.material.opacity = 0.1;
                    obj.material.color = new THREE.Color(0xffffff);
                }
            });
            scene.add(sphereModel);
        },
        undefined,
        (err) => console.error('Ошибка загрузки второй GLTF:', err)
    );



    // КАМЕРА
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 1.5, 6);

    // РЕНДЕРЕР
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.querySelector('.three_bg').appendChild(renderer.domElement);

    // СВЕТ
    const ambientLight = new THREE.AmbientLight(0xff00ff, 0.6); // мягкий общий свет
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 2, 2);
    scene.add(dirLight);

    // GLTF ЗАГРУЗКА
    const loader = new GLTFLoader();
    loader.load(
        '/miqtum/models/eidos.glb/', // вставь сюда ссылку
        (gltf) => {
            model = gltf.scene;
            scene.add(model);
            model.position.set(0, 0, 0); // позиция модели в центре сцены

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                actions = gltf.animations.map((clip) => mixer.clipAction(clip));
            }

            // СОЗДАНИЕ КНОПОК ДЛЯ АНИМАЦИЙ
            for (let i = 0; i < actions.length; i++) {
                const btn = document.getElementById(`btn-m${i}`);
                if (btn) {
                    btn.addEventListener('click', () => playAnimation(i));
                }
            }

            // кнопка возврата камеры в центр
            const btnHome = document.getElementById('btn-home');
            if (btnHome) {
                btnHome.addEventListener('click', () => {
                    controls.reset();
                    camera.position.set(0, 1.5, 3);
                    camera.lookAt(0, 1, 0);
                });
            }
        },
        undefined,
        (err) => console.error('Ошибка загрузки GLTF:', err)
    );

    // КОНТРОЛЛЕРЫ
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0); // камера смотрит в центр сцены
    controls.enablePan = false;   // отключаем панорамирование
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;     // минимальный зум
    controls.maxDistance = 6;     // максимальный зум
    controls.update();

    // ЧАСЫ
    clock = new THREE.Clock();

    window.addEventListener('resize', onWindowResize);
}

function playAnimation(index) {
    if (!mixer || !actions[index]) return;
    actions.forEach(a => a.stop());
    actions[index].reset().play();
    isPlaying = true;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Обновляем анимацию модели
    if (mixer && isPlaying) mixer.update(delta);

    // Автовращение модели вокруг оси Y, если анимация не идёт
    if (model) model.rotation.y += THREE.MathUtils.degToRad(autoRotateSpeed);

    controls.update();
    camera.lookAt(0, 0, 0); // камера смотрит немного выше центра модели
    renderer.render(scene, camera);
}
