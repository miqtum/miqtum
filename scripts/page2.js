import * as THREE from 'three';

// setup scene
const scene = new THREE.Scene();

const wallpaper = document.querySelector(".three_bg");

// setup camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// create cube geometry and material
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00});

// create cube using geometry and material
const cube = new THREE.Mesh(geometry, material);

// add cube to scene
scene.add(cube);

// setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// add renderer to body
wallpaper.appendChild(renderer.domElement);

// animation function
function animate() {
    requestAnimationFrame(animate);

    // rotate cube
    cube.rotation.y += 0.01;

    // render the scene with camera
    renderer.render(scene, camera);
};

// start animation
animate();
