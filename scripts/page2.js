// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// let controls, camera, scene, renderer;


// init();
// animate();

// function init() {

//     // CAMERAS

//     camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 100 );
//     camera.position.set( 0, 0, 2.5 );

//     // SCENE

//     scene = new THREE.Scene();

//     // Textures

//     const loader = new THREE.CubeTextureLoader();
//     loader.setPath( 'textures/cube/Bridge2/' );

//     textureCube = loader.load( [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ] );

//     const textureLoader = new THREE.TextureLoader();

//     textureEquirec = textureLoader.load( 'textures/2294472375_24a3b8ef46_o.jpg' );
//     textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
//     textureEquirec.colorSpace = THREE.SRGBColorSpace;

//     scene.background = textureCube;


//     renderer = new THREE.WebGLRenderer();
//     renderer.setPixelRatio( window.devicePixelRatio );
//     renderer.setSize( window.innerWidth, window.innerHeight );
//     document.body.appendChild( renderer.domElement );

//     //

//     controls = new OrbitControls( camera, renderer.domElement );
//     controls.minDistance = 1.5;
//     controls.maxDistance = 6;


//     const gui = new GUI();
//     gui.add( params, 'Cube' );
//     gui.add( params, 'Equirectangular' );
//     gui.add( params, 'Refraction' ).onChange( function ( value ) {

//         if ( value ) {

//             textureEquirec.mapping = THREE.EquirectangularRefractionMapping;
//             textureCube.mapping = THREE.CubeRefractionMapping;

//         } else {

//             textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
//             textureCube.mapping = THREE.CubeReflectionMapping;

//         }

//         sphereMaterial.needsUpdate = true;

//     } );
//     gui.open();

//     window.addEventListener( 'resize', onWindowResize );

// }

// function onWindowResize() {

//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();

//     renderer.setSize( window.innerWidth, window.innerHeight );

// }

// function animate() {

//     requestAnimationFrame( animate );

//     render();

// }

// function render() {

//     camera.lookAt( scene.position );
//     renderer.render( scene, camera );

// }

import * as THREE from 'three';
//import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, controls, scene, renderer;
let textureEquirec, textureCube;
let sphereMesh, sphereMaterial;

const container = document.querySelector(".three_bg");

init();
animate();

function init() {

	scene = new THREE.Scene();

    // Textures

    const loader = new THREE.CubeTextureLoader();
    loader.setPath( 'static/textures/' );

    textureCube = loader.load( [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ] );

    const textureLoader = new THREE.TextureLoader();

    textureEquirec = textureLoader.load( 'static/2294472375_24a3b8ef46_o.jpg' );
    textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
    textureEquirec.colorSpace = THREE.SRGBColorSpace;

    const params = {
        Cube: function () {

            scene.background = textureCube;

            sphereMaterial.envMap = textureCube;
            sphereMaterial.needsUpdate = true;

        },
        Equirectangular: function () {

            scene.background = textureEquirec;

            sphereMaterial.envMap = textureEquirec;
            sphereMaterial.needsUpdate = true;

        },
        Refraction: false
    };

    scene.background = textureCube;
	
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 400, 200, 0 );

	// controls

controls = new OrbitControls( camera, renderer.domElement );

controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;

controls.screenSpacePanning = false;

controls.minDistance = 100;
controls.maxDistance = 500;

//controls.maxPolarAngle = Math.PI / 2;

//#region ========PIRAMIDES
// const piramide = new THREE.ConeGeometry( 10, 30, 4, 1 );
// const material = new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } );

// for ( let i = 0; i < 500; i ++ ) {

//     const mesh = new THREE.Mesh( piramide, material );
//     mesh.position.x = Math.random() * 1600 - 800;
//     mesh.position.y = 0;
//     mesh.position.z = Math.random() * 1600 - 800;
//     mesh.updateMatrix();
//     mesh.matrixAutoUpdate = false;
//     scene.add( mesh );

// }
//#endregion

// lights

const dirLight1 = new THREE.DirectionalLight( 0xffffff, 3 );
dirLight1.position.set( 1, 1, 1 );
scene.add( dirLight1 );

const dirLight2 = new THREE.DirectionalLight( 0x002288, 3 );
dirLight2.position.set( - 1, - 1, - 1 );
scene.add( dirLight2 );

const ambientLight = new THREE.AmbientLight( 0x555555 );
scene.add( ambientLight );

//

	window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );

	controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

	render();

}

function render() {

	renderer.render( scene, camera );

}
