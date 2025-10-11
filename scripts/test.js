import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let skyboxScene, skyboxCamera;

const container = document.querySelector('.three_bg');

init();
animate();

function init() {
  // --- основная сцена ---
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // --- ТЕСТОВЫЙ SKYBOX ---
  
    const skyGeo = new THREE.SphereGeometry(1000, 60, 40);
    skyGeo.scale(-1, 1, 1);

    const skyMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    wireframe: true,
    side: THREE.BackSide
    });

    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);


  // --- тестовый объект в центре ---
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff8844 })
    );
    scene.add(box);
  
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(5, 10, 5);
    scene.add(light);
  }
  
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
  
    // рендер skybox
    if (skyboxScene && skyboxCamera) {
      renderer.autoClear = true;
      skyboxCamera.position.copy(camera.position);
      renderer.render(skyboxScene, skyboxCamera);
      renderer.autoClear = false;
    }
  
    // рендер основной сцены
    renderer.render(scene, camera);
  }
