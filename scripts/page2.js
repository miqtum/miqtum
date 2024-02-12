import * as THREE from 'three';

// setup scene
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0047ab, 0.1, 50);

//#region ====================particles
const buffer = new THREE.BufferGeometry();
const vertices = [];
const size = 2000;
const wallpaper = document.querySelector(".three_bg");

for (let i = 0; i<1000; i++){
    const x  = (Math.random() * size + Math.random() * size)/2 - size/2;
    const y  = (Math.random() * size + Math.random() * size)/2 - size/2;
    const z  = (Math.random() * size + Math.random() * size)/2 - size/2;

    vertices.push(x,y,z);
}

// setup camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

buffer.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
);

const prtclsMaterial = new THREE.PointsMaterial({
    size: 5,
    color: 0Xffffff,
});

const particles = new THREE.Points(buffer, prtclsMaterial);
scene.add(particles);
//#endregion

let clock = new THREE.Clock();

// setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// add renderer to body
wallpaper.appendChild(renderer.domElement);


// animation function
function animate() {

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    //======= animate particles

    particles.rotation.z += delta * 0.1;	

    // render the scene with camera
    renderer.render(scene, camera);
};

// start animation
animate();
