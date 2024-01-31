import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let camera, scene, renderer;

init();
render();

function init() {

    const container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 20 );
    camera.position.set( 0, 2, 5 );

    scene = new THREE.Scene();

    new RGBELoader()
        .setPath( 'equirectangular/' )
        .load( 'SPACE.hdr', function ( texture ) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;

            render();

            // model

            const loader = new GLTFLoader().setPath( 'models/');
            loader.load('SCOOF.glb', function ( gltf ) {

                scene.add( gltf.scene );

                render();

            } );

        } );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2;
    container.appendChild( renderer.domElement );

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = .05;
    controls.addEventListener( 'change', render ); // use if there is no animation loop
    controls.minDistance = 5;
    controls.maxDistance = 5;
    controls.target.set( 0, 0, - 0.2 );
    controls.enablePan = false;
    //controls.maxAzimuthAngle = THREE.MathUtils.degToRad(90);
    controls.minAzimuthAngle = THREE.MathUtils.degToRad(220);
    controls.minPolarAngle = THREE.MathUtils.degToRad(0);
    controls.update();
    controls.

    window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

    camera.aspect = window.outerWidth / window.outerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.outerWidth, window.outerHeight );

    render();

}
    // Создаем источник направленного света (DirectionalLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 100);
    directionalLight.position.set(0, 0, 0);
    scene.add(directionalLight);

    // Создаем источник окружающего света (AmbientLight)
    const ambientLight = new THREE.AmbientLight(0x404040, 5);
    scene.add(ambientLight);

//

function render() {

    renderer.render( scene, camera );
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

}

		