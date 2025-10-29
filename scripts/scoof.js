import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadRandomModels } from '/miqtum/scripts/utils/loadModels.js';


let camera, scene, renderer;

scene = new THREE.Scene();

//#region scene Lights 

const directionalLight = new THREE.DirectionalLight(0xffffff, .4);
directionalLight.position.set(100, 100, 100);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const cameraLight = new THREE.PointLight(0xffffff, 2, 3, 1);
scene.add(cameraLight);

//#endregion


scene.fog = new THREE.FogExp2('MAGENTA', .06, .1);

fetch('/miqtum/config/models.json')
    .then(res => res.json())
    .then(async data => {
        // доступ к первому элементу массива characters
        const modelUrl = data.characters[0];
        const modelUrl2 = data.default;

        await loadRandomModels(
            scene,
            modelUrl,               // ключ из JSON
            10,                     // количество
            3,                      // радиус
            { x: 1, y: 0.5, z: 1 }, // множители
            .1                     // масштаб
        );

        await loadRandomModels(
            scene,
            modelUrl2,               //ключ из JSON
            10,                     // количество
            3,                      // радиус
            { x: 1, y: 0.5, z: 1 }, // множители
            .1                     // масштаб
        );
    })
    .catch(err => console.error('Ошибка загрузки models.json:', err));

//#region ==============particles
const buffer = new THREE.BufferGeometry();
const vertices = [];
const size = 33;

for (let i = 0; i < 999; i++) {
    const x = (Math.random() * size + Math.random() * size) / 2 - size / 2;
    const y = (Math.random() * size + Math.random() * size) / 2 - size / 2;
    const z = (Math.random() * size + Math.random() * size) / 2 - size / 2;

    vertices.push(x, y, z);
}

buffer.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
);

const prtclsMaterial = new THREE.PointsMaterial({
    size: .05,
    color: 0Xffffff
});

const particles = new THREE.Points(buffer, prtclsMaterial);

scene.add(particles);

//#endregion

camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
camera.position.set(0, 4, 10);

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


//#region controls 
let isMouseDown = false;
let lastSpeed = 0;

document.addEventListener('mousedown', () => {
    isMouseDown = true;
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    controls.autoRotateSpeed = lastSpeed;  // Сохраняем последнее установленное значение скорости
});

document.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
        // Обновляем текущую позицию мыши
        const deltaX = event.movementX; // Используем изменение позиции мыши с события

        // Обновляем направление и скорость вращения в зависимости от положения мыши
        lastSpeed = deltaX * 0.01;  // Устанавливаем скорость вращения
        controls.autoRotateSpeed = lastSpeed;
        controls.autoRotate = true; // Включаем автоматическое вращение
    }
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .05;
controls.minDistance = 1;
controls.maxDistance = 5;
controls.target.set(0, 1, 0);
controls.enablePan = false;

//controls.maxAzimuthAngle = THREE.MathUtils.degToRad(90);
controls.minAzimuthAngle = THREE.MathUtils.degToRad(220);
controls.minPolarAngle = THREE.MathUtils.degToRad(0);

controls.autoRotateSpeed = 0.3;
controls.autoRotate = true;

const minSpeedPositive = 0.3;
const maxSpeedPositive = 2.0;

let baseSpeed = 0.3;          // базовая скорость вращения (по умолчанию)
let lastDirection = 1;        // 1 => вправо, -1 => влево

document.addEventListener('mousedown', () => {
    isMouseDown = true;
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    // вернуть постоянную базовую скорость, сохранив направление
    controls.autoRotateSpeed = lastDirection * baseSpeed;
});

document.addEventListener('mousemove', (event) => {
    if (!isMouseDown) return;

    const deltaX = event.movementX;

    // если движение по X отсутствует — не меняем направление/скорость
    if (deltaX === 0) return;

    // определяем направление по знаку движения
    lastDirection = deltaX > 0 ? 1 : -1;

    // вычисляем новую величину скорости по модулю и ограничиваем её
    const mag = Math.min(maxSpeedPositive, Math.max(minSpeedPositive, Math.abs(deltaX * 0.01)));

    // применяем скорость с учётом направления
    controls.autoRotateSpeed = lastDirection * mag;
    controls.autoRotate = true;
});

controls.update();

//#endregion

const scoof = new GLTFLoader().setPath('/miqtum/models/');
scoof.load('SCOOF.glb', function (gltf) {

    scene.add(gltf.scene);

    render();

});

const glock = new GLTFLoader().setPath('/miqtum/models/')
glock.load('GLOCK.glb', function (gltf) {
    //glock.position.set(0, 0, 0);

    const model = gltf.scene;
    model.position.set(0, 1, .5);
    scene.add(gltf.scene);

    render();
})

window.addEventListener('resize', onWindowResize);

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate(time) {
    requestAnimationFrame(animate);

    prevTime = time;

    cameraLight.position.copy(camera.position); // свет следует за камерой

    controls.update();

    render();
}

window.addEventListener('load', () => {
    const marqueeInner = document.getElementById('marquee__inner');
    const title = document.querySelector('.page-title');

    // покажем заголовок
    if (title) title.classList.add('visible');

    // запускаем бегущую строку через 1500ms после заголовка
    setTimeout(() => {
        if (marqueeInner) {
            // добавляем класс — CSS начинает animation
            marqueeInner.classList.add('running');
        } else {
            console.warn('marqueeInner not found');
        }
    }, 0);
});

console.log('load handler attached, marquee exists=', !!document.getElementById('marquee'));


function render() {

    renderer.render(scene, camera);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 10;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

}

let prevTime = performance.now();


animate(prevTime);