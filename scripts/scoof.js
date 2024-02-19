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

new RGBELoader()
    .setPath( 'equirectangular/' )
    .load( 'SPACE.hdr', function ( texture ) {

        texture.mapping = THREE.EquirectangularReflectionMapping ;
        

        scene.background = texture;
        scene.environment = texture;            

        
    } );
  
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
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.update(); 
 
const loader = new GLTFLoader().setPath( 'models/');
loader.load('SCOOF.glb', function ( gltf ) {

    scene.add( gltf.scene );

    render();

} ); 

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );

    const delta = clock.getDelta();

	controls.update(delta); // only required if controls.enableDamping = true, or if controls.autoRotate = true

	render();

}

function render() {

    renderer.render( scene, camera );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 10;    
    // renderer.setPixelRatio( window.devicePixelRatio );
    // renderer.setSize( window.innerWidth, window.innerHeight );
    // const canvas = renderer.domElement;
    // camera.aspect = canvas.clientWidth / canvas.clientHeight;
    // camera.updateProjectionMatrix();

}

animate();

		