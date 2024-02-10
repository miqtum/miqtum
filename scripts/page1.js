import * as THREE from 'three';

import { XYZLoader } from 'three/addons/loaders/XYZLoader.js';

let camera, scene, renderer, clock, helper, points;

const bg = document.querySelector(".three_bg");
const loader = new XYZLoader();

init();
animate();

function init() {

	camera = new THREE.PerspectiveCamera( 85, window.innerWidth / window.innerHeight, .1, 500);
	camera.position.set( 0, 0, 200);

	helper = new THREE.AxesHelper(100);
	helper.position.set(0,0,0)
	

	scene = new THREE.Scene();
	scene.add( camera );
	scene.add(helper);
	camera.lookAt(helper.position);

	clock = new THREE.Clock();

	
	loader.load('models/ico.xyz', function ( geometry ) {

		// geometry.;				

		const vertexColors = ( geometry.hasAttribute( 'color' ) === true );

		const material = new THREE.PointsMaterial( { size: 5, vertexColors: vertexColors } );

		points = new THREE.Points( geometry, material );
		scene.add( points );

	} );

				//

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	bg.appendChild( renderer.domElement );

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

	const delta = clock.getDelta();

	points.rotation.x += 0;
	// points.rotation.y += delta*0.5;
	points.rotation.z += delta*0.1;

	// if ( points.rotation.y < 1 ) {

	// 	points.rotation.x += delta * 0.0;
	// 	points.rotation.y += delta * 0.1;

	// }

	// else{

	// 	points.rotation.x += delta * 0.1;
	// 	// points.rotation.y -= delta * 0.1;

	// } 
		

	renderer.render( scene, camera );

}

