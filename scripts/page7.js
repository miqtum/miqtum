let scene, camera, renderer, model;

init();
loadModel();
window.addEventListener('scroll', onScroll);

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
}

function loadModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('models/DamagedHelmet/glTF/DamagedHelmet.gltf', function (gltf) {
        model = gltf.scene;
        scene.add(model);
        animate();
    }, undefined, function (error) {
        console.error(error);
    });
}

function onScroll() {
    if (model) {
        const scrollY = window.scrollY;
        const rotationSpeed = 0.001; // Скорость вращения
        model.rotation.y = scrollY * rotationSpeed;
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
