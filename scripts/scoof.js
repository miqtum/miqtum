import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let camera, scene, renderer;

let mouseX = 0;
let mouseY = 0;
let prevMouseX = 0;
let prevMouseY = 0;

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

// new RGBELoader()
//     .setPath( 'equirectangular/' )
//     .load( 'SPACE.hdr', function ( texture ) {

//         texture.mapping = THREE.EquirectangularReflectionMapping ;
        

//         scene.background = texture;
//         scene.environment = texture;            

        
//     } );
  
//#region controls 

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; 
controls.dampingFactor = .05;
controls.minDistance = 5;
controls.maxDistance = 5;
controls.target.set( 0, 0, - 0.2 );
controls.enablePan = false;


// Устанавливаем начальную скорость вращения и включаем автоматическое вращение
controls.autoRotateSpeed = 0.5; // Выбираем любое начальное значение
controls.autoRotate = true;

let isMouseDown = false;
let lastSpeed = controls.autoRotateSpeed;

// Устанавливаем минимальные и максимальные скорости для вращения в каждую сторону
const minSpeedPositive = 0.5; // Минимальная скорость вращения по часовой стрелке
const maxSpeedPositive = 2.0; // Максимальная скорость вращения по часовой стрелке
const minSpeedNegative = -0.5; // Минимальная скорость вращения против часовой стрелки
const maxSpeedNegative = -2.0; // Максимальная скорость вращения против часовой стрелки

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
        let newSpeed = deltaX * 0.1;

        // Ограничиваем скорость в зависимости от направления
        if (newSpeed > 0) {
            newSpeed = Math.max(minSpeedPositive, Math.min(maxSpeedPositive, newSpeed));
        } else if (newSpeed < 0) {
            newSpeed = Math.min(minSpeedNegative, Math.max(maxSpeedNegative, newSpeed));
        }
        else if (newSpeed == 0) {
            newSpeed = 0.5;
        }


        lastSpeed = newSpeed;
        controls.autoRotateSpeed = lastSpeed;
        controls.autoRotate = true;
    }
});


//controls.maxAzimuthAngle = THREE.MathUtils.degToRad(90);
controls.minAzimuthAngle = THREE.MathUtils.degToRad(220);
controls.minPolarAngle = THREE.MathUtils.degToRad(0);
controls.update(); 

//#endregion
 
const scoof = new GLTFLoader().setPath( 'models/');
scoof.load('SCOOF.glb', function ( gltf ) {

    scene.add( gltf.scene );

    render();

} ); 

const glock = new GLTFLoader().setPath('models/')
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

// function animate() {

// 	requestAnimationFrame( animate );

//     const delta = clock.getDelta();

// 	controls.update(); 

// 	render();

// }

function render() {

    renderer.render( scene, camera );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 10; 

}

let prevTime = performance.now();

function animate(time) {
    requestAnimationFrame(animate);

    const delta = (time - prevTime) / 1000;
    prevTime = time;

    controls.update();

    render();
}

animate(prevTime);