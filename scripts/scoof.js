import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    loadGLBModel,
    loadAnimatedModelSimple,
    // loadModelWthAnimTex,
    // ModelWthAnimTexUtils,
    loadAnimatedModelByMaterial,
    randomScatterGLB,
    randomScatterInstances
} from '/miqtum/scripts/utils/loaders.js'
import {
    highlightAndDelete
} from '/miqtum/scripts/utils/selectors.js';

let camera, scene, renderer;

scene = new THREE.Scene();

//#region scene Lights 

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(0, 25, 25);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const cameraLight = new THREE.PointLight(0xffffff, 8, 3, 1);
scene.add(cameraLight);

//#endregion


scene.fog = new THREE.FogExp2('BLUE', .05, 1);

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
particles.name = 'particles';
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

//#region models 

//SCOOF
loadGLBModel({
    modelPath: '/miqtum/models',
    name: 'SCOOF',
    scene,
    position: [0, 0, 0],
    rotation: [0, 0, 0], // в градусах
    scale: 1
    ,
});

//pistol
loadGLBModel({
    modelPath: '/miqtum/models',
    name: 'pistol',
    scene,
    position: [-.4, .8, -.1],
    rotation: [0, 0, 0], // в градусах
    scale: 1
    ,
});

//joystick
loadGLBModel({
    modelPath: '/miqtum/models',
    name: 'joystick',
    scene,
    position: [.8, 1, .4],
    rotation: [270, 0, 245], // в градусах
    scale: 1
    ,
});

//icecream
loadGLBModel({
    modelPath: '/miqtum/models',
    name: 'icecream',
    scene,
    position: [-.3, 1, .2],
    rotation: [15, 0, 35], // в градусах
    scale: 1
    ,
});


//trash packets
randomScatterInstances({
    url: "/miqtum/models/trash.glb",
    scene,
    count: 20,
    minRadius: 2,
    maxRadius: 3,
    maxHeight: 3,
    rotationLimits: { x: 0, y: 180, z: 0 },
    scaleLimits: { min: .2, max: .5 }
});

//garbage_objs
randomScatterGLB({
    url: "/miqtum/models/garbage_objs.glb",
    scene,
    minRadius: 1.3,
    maxRadius: 3,
    maxHeight: 2,                // разброс по Y
    rotationLimits: { x: 45, y: 180, z: 0 }, // вращаем только по Y
    scaleLimits: { min: 1, max: 1 },     // рандомный скейл
});

//iphone
loadGLBModel({
    modelPath: '/miqtum/models',
    name: 'iphone',
    scene,
    position: [.3, 1, 0],
    rotation: [0, 250, 0], // в градусах
    scale: 1
    ,
});

// PC glb


// iphone glb
// loadGLBModel({
//     modelPath: '/miqtum/models',
//     name: 'iphone',
//     scene,
//     position: [.3, 1, 0],
//     rotation: [0, 250, 0], // в градусах
//     scale: 1
//     ,
// });

//PC animated screen
const PC = await loadAnimatedModelByMaterial(
    '/miqtum/models/PC_mult_mat.glb',           // URL модели
    '/miqtum/models/PC/signs_sq.mp4',          // URL видео
    'SCREEN',                // Имя целевого материала
    { x: 0, y: 0.5, z: 1.2 },            // Положение
    { x: 0, y: 180, z: 0 },            // Поворот
    1,                             // Масштаб
    {                                // Настройки текстуры
        offset: { x: 0, y: 0 },    // Смещение
        repeat: { x: 1, y: 1 },    // Масштаб
        rotation: 0,                   // Поворот
        noTiling: true,                // Без повторения
        blendMode: 'emissive'          // Режим наложения
    }
);

scene.add(PC);

//#endregion

// Без тайлинга (по умолчанию) - видео как наклейка поверх основного материала
// const model1 = await loadModelWthAnimTex(
//     '/miqtum/models/PC/PC.gltf',           // URL модели
//     '/miqtum/models/PC/signs_sq.mp4',
//     { x: 0, y: 0, z: 0 },
//     { x: 0, y: 0, z: 0 },
//     3.0,
//     {
//         offset: { x: 0, y: 0 },
//         repeat: { x: 22, y: 22 },  // Маленькая текстура
//         rotation: 15,
//         noTiling: false,  // Видео как наклейка поверх основного материала
//     }
// );

// PC with tex anim
// const PC = await loadAnimatedModelSimple(
//     '/miqtum/models/PC/PC.gltf',           // URL модели
//      '/miqtum/models/PC/signs_sq.mp4',
//     { x: 0, y: 0, z: 0 },
//     { x: 0, y: 0, z: 0 },
//     3,
//     {
//         offset: { x: 0, y: .5 },
//         repeat: { x: 8, y: 8 },
//         rotation: 0,
//         noTiling: true  // Видео как emissive карта поверх основного материала
//     }
// );

// scene.add(PC);


//clicker
const highlighter = highlightAndDelete({
    renderer,
    scene,
    camera,
    except: ['particles', 'Cube010', 'Cube010_1', 'Cube010_2', 'Cube010_3', 'SCOOF_sitting']
});

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
    highlighter.render();
    // renderer.render(scene, camera);
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
}

let prevTime = performance.now();

animate(prevTime);