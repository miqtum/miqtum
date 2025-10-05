import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, controls, scene, renderer;
let textureEquirec, textureCube;
let sphereMesh, sphereMaterial;

const container = document.querySelector('.three_bg');

init();
animate();

function init() {

	scene = new THREE.Scene();

	//#region ================ Textures

	const loader = new THREE.CubeTextureLoader();
	loader.setPath( '/scripts/miqtum/static/textures/');

	textureCube = loader.load( [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ] );

	const textureLoader = new THREE.TextureLoader();

	textureEquirec = textureLoader.load( '/scripts/miqtum/static/bureau.jpg' );
	textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
	textureEquirec.colorSpace = THREE.SRGBColorSpace;
	//#endregion

    const params = {
        SeverskayaMost: function () {

            scene.background = textureCube;

            sphereMaterial.envMap = textureCube;
            sphereMaterial.needsUpdate = true;

        },
        MonBureau: function () {

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

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.position.set( 0, 0, 2.5 );

	// controls

//#region CONTROLS 

	controls = new OrbitControls( camera, renderer.domElement );

	controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.screenSpacePanning = false;

	controls.minDistance = 1.5;
	controls.maxDistance = 6;

	const dirLight1 = new THREE.DirectionalLight( 0xffffff, 3 );
	dirLight1.position.set( 1, 1, 1 );
	scene.add( dirLight1 );

	const dirLight2 = new THREE.DirectionalLight( 0x002288, 3 );
	dirLight2.position.set( - 1, - 1, - 1 );
	scene.add( dirLight2 );

	const ambientLight = new THREE.AmbientLight( 0x555555 );
	scene.add( ambientLight );

	//#endregion

	const gui = new GUI();
	gui.add( params, 'SeverskayaMost' );
	gui.add( params, 'MonBureau' );
	gui.open();

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
