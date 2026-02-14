
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ProjectData } from '../types';

interface WebXRProps {
    project?: ProjectData;
}

export const WebXR = ({ project }: WebXRProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let container: HTMLElement;
        let camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
        let hand1: THREE.XRHandSpace, hand2: THREE.XRHandSpace;
        let controller1: THREE.XRTargetRaySpace, controller2: THREE.XRTargetRaySpace;
        let controllerGrip1: THREE.XRGripSpace, controllerGrip2: THREE.XRGripSpace;

        // Type definition for hand models logic
        const handModels = {
            left: [] as THREE.Object3D[],
            right: [] as THREE.Object3D[]
        };

        let controls: OrbitControls;

        init();
        animate();

        async function loadModels() {
            const loader = new GLTFLoader();
            try {
                let assetsToLoad = [];

                if (project && project.assets) {
                    assetsToLoad = project.assets;
                } else {
                    const response = await fetch('/defaultScenes/DQ00HD_Anatomy_of_the_Heart 2.json');
                    const projectData = await response.json();
                    assetsToLoad = projectData.assets;
                }

                assetsToLoad.forEach((asset: any) => {
                    if (asset.type === 'model' && asset.url) {
                        loader.load(asset.url, (gltf) => {
                            const model = gltf.scene;
                            model.name = asset.id;

                            // Apply transformations
                            if (asset.position) model.position.set(...(asset.position as [number, number, number]));
                            if (asset.rotation) model.rotation.set(...(asset.rotation as [number, number, number]));
                            if (asset.scale) model.scale.set(...(asset.scale as [number, number, number]));

                            // Apply visibility and opacity
                            model.visible = asset.visible !== false;

                            if (asset.opacity !== undefined && asset.opacity < 1) {
                                model.traverse((child) => {
                                    if ((child as THREE.Mesh).isMesh) {
                                        const mesh = child as THREE.Mesh;
                                        if (mesh.material) {
                                            if (Array.isArray(mesh.material)) {
                                                mesh.material.forEach(mat => {
                                                    mat.transparent = true;
                                                    mat.opacity = asset.opacity;
                                                });
                                            } else {
                                                mesh.material.transparent = true;
                                                mesh.material.opacity = asset.opacity;
                                            }
                                        }
                                    }
                                });
                            }

                            scene.add(model);
                        });
                    }
                });
            } catch (error) {
                console.error('Error loading models in WebXRDebug:', error);
            }
        }

        function init() {
            container = containerRef.current!;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x444444);

            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
            camera.position.set(0, 1.6, 3);

            controls = new OrbitControls(camera, container);
            controls.target.set(0, 1.6, 0);
            controls.update();

            const floorGeometry = new THREE.PlaneGeometry(10, 10);
            const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            scene.add(new THREE.HemisphereLight(0xbcbcbc, 0xa5a5a5, 3));

            const light = new THREE.DirectionalLight(0xffffff, 3);
            light.position.set(0, 6, 0);
            light.castShadow = true;
            light.shadow.camera.top = 2;
            light.shadow.camera.bottom = -2;
            light.shadow.camera.right = 2;
            light.shadow.camera.left = -2;
            light.shadow.mapSize.set(4096, 4096);
            scene.add(light);

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            renderer.xr.enabled = true;

            container.appendChild(renderer.domElement);

            // VR Button
            const sessionInit = { requiredFeatures: ['hand-tracking'] };
            document.body.appendChild(VRButton.createButton(renderer, sessionInit));

            // Controllers
            controller1 = renderer.xr.getController(0);
            scene.add(controller1);

            controller2 = renderer.xr.getController(1);
            scene.add(controller2);

            const controllerModelFactory = new XRControllerModelFactory();
            const handModelFactory = new XRHandModelFactory();

            // Hand 1 (Left)
            controllerGrip1 = renderer.xr.getControllerGrip(0);
            controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
            scene.add(controllerGrip1);

            hand1 = renderer.xr.getHand(0);
            // @ts-ignore
            hand1.userData.currentHandModel = 0;
            scene.add(hand1);

            handModels.left = [
                handModelFactory.createHandModel(hand1, 'boxes'),
                handModelFactory.createHandModel(hand1, 'spheres'),
                handModelFactory.createHandModel(hand1, 'mesh')
            ];

            handModels.left.forEach((model, i) => {
                model.visible = i === 0;
                hand1.add(model);
            });

            hand1.addEventListener('pinchend', function (event: any) {
                const hand = event.target;
                handModels.left[hand.userData.currentHandModel].visible = false;
                hand.userData.currentHandModel = (hand.userData.currentHandModel + 1) % 3;
                handModels.left[hand.userData.currentHandModel].visible = true;
            });

            // Hand 2 (Right)
            controllerGrip2 = renderer.xr.getControllerGrip(1);
            controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
            scene.add(controllerGrip2);

            hand2 = renderer.xr.getHand(1);
            // @ts-ignore
            hand2.userData.currentHandModel = 0;
            scene.add(hand2);

            handModels.right = [
                handModelFactory.createHandModel(hand2, 'boxes'),
                handModelFactory.createHandModel(hand2, 'spheres'),
                handModelFactory.createHandModel(hand2, 'mesh')
            ];

            handModels.right.forEach((model, i) => {
                model.visible = i === 0;
                hand2.add(model);
            });

            hand2.addEventListener('pinchend', function (event: any) {
                const hand = event.target;
                handModels.right[hand.userData.currentHandModel].visible = false;
                hand.userData.currentHandModel = (hand.userData.currentHandModel + 1) % 3;
                handModels.right[hand.userData.currentHandModel].visible = true;
            });

            // Ray Lines
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -1)
            ]);
            const line = new THREE.Line(geometry);
            line.name = 'line';
            line.scale.z = 5;

            controller1.add(line.clone());
            controller2.add(line.clone());

            // Load additional models
            loadModels();

            // Resize
            window.addEventListener('resize', onWindowResize);
        }

        function onWindowResize() {
            if (!camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            renderer.setAnimationLoop(render);
        }

        function render() {
            renderer.render(scene, camera);
        }

        // Cleanup function
        return () => {
            renderer.setAnimationLoop(null);
            window.removeEventListener('resize', onWindowResize);
            if (renderer && renderer.domElement) {
                renderer.domElement.remove();
                if (renderer.domElement.parentElement) {
                    renderer.domElement.parentElement.removeChild(renderer.domElement);
                }
            }

            const vrButton = document.getElementById('VRButton');
            if (vrButton) vrButton.remove();

            renderer.dispose();
        };

    }, []);

    return <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 9999 }} />;
};
