import * as THREE from 'three'
            import { OrbitControls } from '/jsm/controls/OrbitControls.js'
            import { GLTFLoader } from '/jsm/loaders/GLTFLoader.js'
            import Stats from '/jsm/libs/stats.module.js'

            const scene = new THREE.Scene()
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000)
            camera.position.set(4, 4, 4)

            
            const renderer = new THREE.WebGLRenderer()
            renderer.setSize(window.innerWidth, window.innerHeight)

            const container = document.querySelector('.three_bg');
            container.appendChild(renderer.domElement);

            
            // document.body.appendChild(renderer.domElement)
            const controls = new OrbitControls(camera, renderer.domElement)
            let mixer
            let modelReady = false
            const gltfLoader = new GLTFLoader()
            const dropzone = document.getElementById('dropzone')
            // dropzone.ondragover = dropzone.ondragenter = function (evt) {
            //     evt.preventDefault()
            // }

            const light1 = new THREE.DirectionalLight(new THREE.Color(0xffcccc), 2)
            light1.position.set(-1, 1, 1)
            scene.add(light1)
            const light2 = new THREE.DirectionalLight(new THREE.Color(0xccffcc), 2)
            light2.position.set(1, 1, 1)
            scene.add(light2)
            const light3 = new THREE.DirectionalLight(new THREE.Color(0xccccff), 2)
            light3.position.set(0, -1, 0)
            scene.add(light3)

            mixer = new THREE.AnimationMixer(gltf.scene)
                            console.log(gltf.animations)
                            if (gltf.animations.length > 0) {
                                const animationsPanel = document.getElementById('animationsPanel')
                                const ul = document.createElement('UL')
                                const ulElem = animationsPanel.appendChild(ul)
                                gltf.animations.forEach((a, i) => {
                                    const li = document.createElement('UL')
                                    const liElem = ulElem.appendChild(li)
                                    const checkBox = document.createElement('INPUT')
                                    checkBox.id = 'checkbox_' + i
                                    checkBox.type = 'checkbox'
                                    checkBox.addEventListener('change', (e) => {
                                        if (e.target.checked) {
                                            mixer.clipAction(gltf.animations[i]).play()
                                        } else {
                                            mixer.clipAction(gltf.animations[i]).stop()
                                        }
                                    })
                                    liElem.appendChild(checkBox)
                                    const label = document.createElement('LABEL')
                                    label.htmlFor = 'checkbox_' + i
                                    label.innerHTML = a.name
                                    liElem.appendChild(label)
                                })

                                if (gltf.animations.length > 1) {
                                    const btnPlayAll = document.getElementById('btnPlayAll')
                                    btnPlayAll.addEventListener('click', (e) => {
                                        mixer.stopAllAction()
                                        gltf.animations.forEach((a) => {
                                            mixer.clipAction(a).play()
                                        })
                                    })

                                    btnPlayAll.style.display = 'block'
                                }

            // dropzone.ondrop = function (evt) {
            //     evt.stopPropagation()
            //     evt.preventDefault()
            //     //clear the scene
            //     for (let i = scene.children.length - 1; i >= 0; i--) {
            //         scene.remove(scene.children[i])
            //     }
            //     //clear the checkboxes
            //     const myNode = document.getElementById('animationsPanel')
            //     while (myNode.firstChild) {
            //         myNode.removeChild(myNode.lastChild)
            //     }
            //     const axesHelper = new THREE.AxesHelper(5)
            //     scene.add(axesHelper)
                
            //     const files = evt.dataTransfer.files
            //     const reader = new FileReader()
            //     reader.onload = function () {
            //         gltfLoader.parse(
            //             reader.result,
            //             '/',
            //             (gltf) => {
            //                 console.log(gltf.scene)
                            
            //                 } else {
            //                     const animationsPanel = document.getElementById('animationsPanel')
            //                     animationsPanel.innerHTML = 'No animations found in model'
            //                 }

            //                 //Center model in view
            //                 const box = new THREE.Box3().setFromObject(gltf.scene)
            //                 const center = box.getCenter(new THREE.Vector3())
            //                 gltf.scene.position.x += gltf.scene.position.x - center.x
            //                 gltf.scene.position.y += gltf.scene.position.y - center.y
            //                 gltf.scene.position.z += gltf.scene.position.z - center.z

            //                 scene.add(gltf.scene)

            //                 modelReady = true
            //             },
            //             (error) => {
            //                 console.log(error)
            //             }
            //         )
            //     }
            //     reader.readAsArrayBuffer(files[0])
            // }
            
            function onWindowResize() {
                camera.aspect = window.innerWidth / window.innerHeight
                camera.updateProjectionMatrix()
                renderer.setSize(window.innerWidth, window.innerHeight)
                render()
            }
            window.addEventListener('resize', onWindowResize, false)
            
            const clock = new THREE.Clock()

            function animate() {
                requestAnimationFrame(animate)
                controls.update()
                if (modelReady) mixer.update(clock.getDelta())
                render()
                stats.update()
            }

            function render() {
                renderer.render(scene, camera)
            }

            animate()