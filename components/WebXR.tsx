
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
        let userGroup: THREE.Group;
        let loadingGroup: THREE.Group;
        let loadingTextMesh: THREE.Mesh;
        let loadingSpinner: THREE.Mesh;
        let isLoading = true;
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

        function createLoadingUI() {
            loadingGroup = new THREE.Group();
            loadingGroup.position.set(0, 1.6, -2); // At eye level, in front of user
            scene.add(loadingGroup);

            // Spinner
            const spinnerGeo = new THREE.TorusGeometry(0.1, 0.015, 16, 100, Math.PI * 1.5);
            const spinnerMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
            loadingSpinner = new THREE.Mesh(spinnerGeo, spinnerMat);
            loadingSpinner.position.y = 0.15; // Raised slightly
            loadingGroup.add(loadingSpinner);

            // Text
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const context = canvas.getContext('2d')!;
            context.fillStyle = 'rgba(0,0,0,0)';
            context.fillRect(0, 0, 512, 128);
            context.font = 'Bold 40px Inter, Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle'; // Center text vertically
            context.fillText('Initializing VR...', 256, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const textGeo = new THREE.PlaneGeometry(1, 0.25);
            const textMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            loadingTextMesh = new THREE.Mesh(textGeo, textMat);
            loadingTextMesh.position.y = -0.1; // Closer to spinner
            loadingGroup.add(loadingTextMesh);
        }

        function updateLoadingText(text: string) {
            if (!loadingTextMesh) return;
            const material = loadingTextMesh.material as THREE.MeshBasicMaterial;
            const canvas = (material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
            const context = canvas.getContext('2d')!;
            context.clearRect(0, 0, 512, 128);
            context.font = 'Bold 40px Inter, Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle'; // Center text vertically
            context.fillText(text, 256, 64);
            (material.map as THREE.CanvasTexture).needsUpdate = true;
        }

        async function loadModels() {
            const loader = new GLTFLoader();

            // Helper to load a single model with a Promise
            const loadModelAsync = (url: string): Promise<THREE.Group> => {
                return new Promise((resolve, reject) => {
                    loader.load(url,
                        (gltf) => resolve(gltf.scene),
                        undefined,
                        (error) => reject(error)
                    );
                });
            };

            try {
                let assetsToLoad = [];

                if (project && project.assets) {
                    assetsToLoad = project.assets;
                } else {
                    const response = await fetch('/defaultScenes/DQ00HD_Anatomy_of_the_Heart 2.json');
                    const projectData = await response.json();
                    assetsToLoad = projectData.assets;
                }

                const total = assetsToLoad.filter(a => a.type === 'model' && a.url).length;
                let current = 0;

                // Sequential loading to prevent memory spikes and browser crashes
                for (const asset of assetsToLoad) {
                    if (asset.type === 'model' && asset.url) {
                        try {
                            updateLoadingText(`Loading Models: ${current}/${total}`);
                            const model = await loadModelAsync(asset.url);
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
                            current++;
                            console.log(`Loaded model: ${asset.name || asset.id}`);
                        } catch (error) {
                            console.error(`Error loading model ${asset.url}:`, error);
                        }
                    }
                }

                // Scene Pre-warming: Compile shaders and prepare materials
                updateLoadingText('Preparing scene...');
                renderer.compile(scene, camera);

                // Stabilization Buffer: Wait 1s to allow GPU data upload to finish
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Hide Loading UI when done
                if (loadingGroup) {
                    scene.remove(loadingGroup);
                    loadingGroup.traverse(obj => {
                        if ((obj as THREE.Mesh).isMesh) {
                            (obj as THREE.Mesh).geometry.dispose();
                            if (Array.isArray((obj as THREE.Mesh).material)) {
                                ((obj as THREE.Mesh).material as THREE.Material[]).forEach(m => m.dispose());
                            } else {
                                ((obj as THREE.Mesh).material as THREE.Material).dispose();
                            }
                        }
                    });
                }

                isLoading = false;

                // Show controllers and hands
                controller1.visible = true;
                controller2.visible = true;
                controllerGrip1.visible = true;
                controllerGrip2.visible = true;
                hand1.visible = true;
                hand2.visible = true;

            } catch (error) {
                console.error('Error in loadModels:', error);
                updateLoadingText('Error loading models');
            }
        }

        function init() {
            container = containerRef.current!;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x444444);

            userGroup = new THREE.Group();
            scene.add(userGroup);

            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
            camera.position.set(0, 1.6, 3);
            userGroup.add(camera);

            controls = new OrbitControls(camera, container);
            controls.target.set(0, 1.6, 0);
            controls.update();

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
            controller1.visible = false;
            userGroup.add(controller1);

            controller2 = renderer.xr.getController(1);
            controller2.visible = false;
            userGroup.add(controller2);

            const controllerModelFactory = new XRControllerModelFactory();
            const handModelFactory = new XRHandModelFactory();

            // Hand 1 (Left)
            controllerGrip1 = renderer.xr.getControllerGrip(0);
            controllerGrip1.visible = false;
            controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
            userGroup.add(controllerGrip1);

            hand1 = renderer.xr.getHand(0);
            hand1.visible = false;
            // @ts-ignore
            hand1.userData.currentHandModel = 2;
            userGroup.add(hand1);

            handModels.left = [
                handModelFactory.createHandModel(hand1, 'boxes'),
                handModelFactory.createHandModel(hand1, 'spheres'),
                handModelFactory.createHandModel(hand1, 'mesh')
            ];

            handModels.left.forEach((model, i) => {
                model.visible = i === 2;
                hand1.add(model);
            });

            /*
            hand1.addEventListener('pinchend', function (event: any) {
                const hand = event.target;
                handModels.left[hand.userData.currentHandModel].visible = false;
                hand.userData.currentHandModel = (hand.userData.currentHandModel + 1) % 3;
                handModels.left[hand.userData.currentHandModel].visible = true;
            });
            */

            // Hand 2 (Right)
            controllerGrip2 = renderer.xr.getControllerGrip(1);
            controllerGrip2.visible = false;
            controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
            userGroup.add(controllerGrip2);

            hand2 = renderer.xr.getHand(1);
            // @ts-ignore
            hand2.userData.currentHandModel = 2;
            userGroup.add(hand2);

            handModels.right = [
                handModelFactory.createHandModel(hand2, 'boxes'),
                handModelFactory.createHandModel(hand2, 'spheres'),
                handModelFactory.createHandModel(hand2, 'mesh')
            ];

            handModels.right.forEach((model, i) => {
                model.visible = i === 2;
                hand2.add(model);
            });

            /*
            hand2.addEventListener('pinchend', function (event: any) {
                const hand = event.target;
                handModels.right[hand.userData.currentHandModel].visible = false;
                hand.userData.currentHandModel = (hand.userData.currentHandModel + 1) % 3;
                handModels.right[hand.userData.currentHandModel].visible = true;
            });
            */

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

            // Loading UI
            createLoadingUI();

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

        // Memory management: Pre-allocate vectors and variables used in render loop
        const clock = new THREE.Clock();
        const _forward = new THREE.Vector3();
        const _right = new THREE.Vector3();

        function handleLocomotion(delta: number) {
            if (isLoading) return;

            const session = renderer.xr.getSession();
            if (!session) return;

            const speed = 2.5;
            const rotationSpeed = 2.0;

            for (const source of session.inputSources) {
                if (source.gamepad) {
                    const axes = source.gamepad.axes;

                    // Left joystick (Movement) - Axis 2 (X), 3 (Y)
                    if (source.handedness === 'left') {
                        const x = axes[2] || 0;
                        const y = axes[3] || 0;

                        if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
                            // Get camera direction (flattened to XZ plane)
                            camera.getWorldDirection(_forward);
                            _forward.y = 0;
                            _forward.normalize();

                            _right.crossVectors(camera.up, _forward).negate().normalize();

                            userGroup.position.addScaledVector(_forward, -y * speed * delta);
                            userGroup.position.addScaledVector(_right, x * speed * delta);
                        }
                    }

                    // Right joystick (Rotation)
                    if (source.handedness === 'right') {
                        const x = axes[2] || 0;
                        if (Math.abs(x) > 0.05) {
                            userGroup.rotation.y -= x * rotationSpeed * delta;
                        }
                    }
                }
            }
        }

        function animate() {
            renderer.setAnimationLoop(render);
        }

        function render() {
            const delta = clock.getDelta();
            handleLocomotion(delta);

            if (loadingSpinner && loadingGroup.parent) {
                loadingSpinner.rotation.z += delta * 4;
            }

            renderer.render(scene, camera);
        }

        // Cleanup function
        return () => {
            renderer.setAnimationLoop(null);
            window.removeEventListener('resize', onWindowResize);

            // Proper disposal of Three.js resources
            scene.traverse((object) => {
                if ((object as THREE.Mesh).isMesh) {
                    const mesh = object as THREE.Mesh;
                    mesh.geometry.dispose();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(m => m.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            });

            if (renderer && renderer.domElement) {
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
