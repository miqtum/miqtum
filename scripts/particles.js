import * as THREE from 'three';
import { XYZLoader } from 'three/addons/loaders/XYZLoader.js';

let camera, scene, renderer, clock;

let points;

const bg = document.querySelector(".three_bg");

let starsGeometry = new THREE.TorusKnotGeometry(100,100,100);

// starsGeometry.position.

init();
animate();

function init() {
	
    camera = new THREE.PerspectiveCamera(100,window.innerWidth / window.innerHeight, 1,1000);
    camera.position.set(0,100,100);
    camera.lookAt(new THREE.Vector3(0,0,0))
    
	scene = new THREE.Scene();
	scene.add( camera );
    scene.add( starsGeometry );
	// camera.lookAt( scene.position );

	clock = new THREE.Clock();

	const loader = new XYZLoader();
	loader.load('models/ico.xyz', function ( geometry ) {

		geometry.center();				

		const vertexColors = ( geometry.hasAttribute( 'color' ) === true );

		const material = new THREE.PointsMaterial( { size: 1, vertexColors: vertexColors } );

		points = new THREE.Points( starsGeometry, material );
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

	if ( points ) {

		points.rotation.x += delta * 0.0;
		points.rotation.y += delta * 0.1;

	}

	renderer.render( scene, camera );

}