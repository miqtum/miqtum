import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let camera, scene, renderer;
let clock = new THREE.Clock();

scene = new THREE.Scene();

//const wallpaper = document.querySelector(".three_bg");


const directionalLight = new THREE.DirectionalLight(0xffffff, .4);
directionalLight.position.set(100, 100, 100);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight); 

scene.fog = new THREE.FogExp2( 'MAGENTA', .08, 50 );

//#region ==============particles
const buffer = new THREE.BufferGeometry();
const vertices = [];
const size = 33;

for (let i = 0; i<999; i++){
    const x  = (Math.random() * size + Math.random() * size)/2 - size/2;
    const y  = (Math.random() * size + Math.random() * size)/2 - size/2;
    const z  = (Math.random() * size + Math.random() * size)/2 - size/2;

    vertices.push(x,y,z);
}

camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 20 );
camera.position.set( 0, 5, 10 );

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

    
renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

  
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

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; 
controls.dampingFactor = .05;
controls.minDistance = 5;
controls.maxDistance = 5;
controls.target.set( 0, 0, - 0.2 );
controls.enablePan = false;

//controls.maxAzimuthAngle = THREE.MathUtils.degToRad(90);
controls.minAzimuthAngle = THREE.MathUtils.degToRad(220);
controls.minPolarAngle = THREE.MathUtils.degToRad(0);

controls.autoRotateSpeed = 0.3; 
controls.autoRotate = true;

const minSpeedPositive = 0.3;
const maxSpeedPositive = 2.0;
const minSpeedNegative = -0.3;
const maxSpeedNegative = -2.0; 

document.addEventListener('mousedown', () => {
    isMouseDown = true;
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    controls.autoRotateSpeed = lastSpeed;
});

document.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
        const deltaX = event.movementX;
        let newSpeed = deltaX * 0.01;

        // Ограничиваем скорость в зависимости от направления
        if (newSpeed > 0) {
            newSpeed = Math.max(minSpeedPositive, Math.min(maxSpeedPositive, newSpeed));
        } else if (newSpeed < 0) {
            newSpeed = Math.min(minSpeedNegative, Math.max(maxSpeedNegative, newSpeed));
        }

        lastSpeed = newSpeed;
        controls.autoRotateSpeed = lastSpeed;
        controls.autoRotate = true;
    }
});

controls.update(); 

//#endregion
 
const scoof = new GLTFLoader().setPath( '/miqtum/models/');
scoof.load('SCOOF.glb', function ( gltf ) {

    scene.add( gltf.scene );

    render();

} ); 

const glock = new GLTFLoader().setPath('/scripts/miqtum/models/')
glock.load('GLOCK.glb', function(gltf){
    //glock.position.set(0, 0, 0);
    
    const model = gltf.scene;
    model.position.set(0, 1, .5);
    scene.add( gltf.scene );

    render();
})


window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate(time) {
    requestAnimationFrame(animate);

    const delta = (time - prevTime) / 1000;
    prevTime = time;

    // Здесь просто вызовите update без аргументов
    controls.update();

    render();
}


function render() {

    renderer.render( scene, camera );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 10;    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

}

let prevTime = performance.now();


animate(prevTime);


// animate();