import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// setup scene & camera
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0047ab, 0.005);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;


//#region ======================particles
const buffer = new THREE.BufferGeometry();
const vertices = [];
const size = 2000;
const wallpaper = document.querySelector(".three_bg");

let clock = new THREE.Clock();

for (let i = 0; i<1000; i++){
    const x  = (Math.random() * size + Math.random() * size)/2 - size/2;
    const y  = (Math.random() * size + Math.random() * size)/2 - size/2;
    const z  = (Math.random() * size + Math.random() * size)/2 - size/2;

    vertices.push(x,y,z);
}

const prtclsMaterial = new THREE.PointsMaterial({
    size: 3,
    color: 0Xfffff28b4,
});

const particles = new THREE.Points(buffer, prtclsMaterial);
scene.add(particles);
//#endregion

buffer.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
);

// setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// add renderer to body
wallpaper.appendChild(renderer.domElement);

const loader = new GLTFLoader().setPath( '/scripts/miqtum/models/');
loader.load('SCOOF.glb', function ( gltf ) {

	scene.add( gltf.scene );


} );

// animation function
function animate() {

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    //======= animate particles

    particles.rotation.y += delta * 0.03;	

    // render the scene with camera
    renderer.render(scene, camera);
};

// start animation
animate();
