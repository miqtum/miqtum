import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let camera, scene, renderer;


init();
render();

function init() {

    // const container = document.createElement( 'div' );
    // document.body.appendChild( container );
    const wallpaper = document.querySelector(".three_bg");

    const buffer = new THREE.BufferGeometry();
    const vertices = [];
    const size = 1555;

    for (let i = 0; i<500; i++){
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
        size: 5,
        color: 0Xffffff
    });

    const particles = new THREE.Points(buffer, prtclsMaterial);    


    scene = new THREE.Scene();
    scene.add(particles);
    scene.fog = new THREE.FogExp2( 'CYAN', .1, 50 );
			
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    new RGBELoader()
        .setPath( 'equirectangular/' )
        .load( 'SPACE.hdr', function ( texture ) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            // scene.background = texture;
            // scene.environment = texture;            

            // model

    const loader = new GLTFLoader().setPath( 'models/');
    loader.load('SCOOF.glb', function ( gltf ) {

        scene.add( gltf.scene );

        render();

    } );

        } );
    
        
    // container.appendChild( renderer.domElement );
    wallpaper.appendChild(renderer.domElement);

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
    
    // Создаем источник направленного света (DirectionalLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, .4);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
    

    // Создаем источник окружающего света (AmbientLight)
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);    

    window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

    camera.aspect = window.outerWidth / window.outerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.outerWidth, window.outerHeight );

    render();

}


//

function render() {

    renderer.render( scene, camera );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 10;    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

}

		