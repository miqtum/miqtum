import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, controls, scene, renderer;

const container = document.querySelector(".three_bg");


init();
animate();

function init() {

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xcccccc);
	scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.set(0,0, 145);

	// controls

	controls = new OrbitControls(camera, renderer.domElement);
	
	controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.screenSpacePanning = false;
	controls.panSpeed = 0;
	
	controls.minDistance = 55;
	controls.maxDistance = 500;

	controls.maxPolarAngle = Math.PI / 2;

	// world


	const geometry = new THREE.ConeGeometry(10, 30, 4, 1);
	const material = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
	const mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);


	// lights

	const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
	dirLight1.position.set(1, 1, 1);
	scene.add(dirLight1);

	const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
	dirLight2.position.set(- 1, - 1, - 1);
	scene.add(dirLight2);

	const ambientLight = new THREE.AmbientLight(0x555555);
	scene.add(ambientLight);

	//

	const raycaster = new THREE.Raycaster();
	const handleClick = (Event) => {
		const pointer =- new THREE.Vector2() 
		pointer.x = (Event.clientX/window.innerWidth)*2-1;
		pointer.y = -(Event.clientX/window.innerHeight)*2+1;

		raycaster.setFromCamera(pointer, camera)
		const intersections = raycaster.intersectObject(mesh);

		intersections.object.material.color.set('purple');
		console.log('click');

	}

	window.addEventListener('click', handleClick);
	

	window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

	console.log("resize");

}

function animate() {

	requestAnimationFrame(animate);

	controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

	render();

}

function render() {

	renderer.render(scene, camera);

}