
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
        let isStarted = false; // New: Lesson start flag
        let currentStepIndex = 0;
        let completed = false;
        const snappedObjects = new Set<string>();
        let holdingAssetId: string | null = null;
        let holdingHand: THREE.Group | null = null;
        let startButton: THREE.Mesh | null = null; // New: Start button mesh
        const sessionAssets = [...(project?.assets || [])];

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
            const spinnerMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1.0,
                depthTest: false,
                depthWrite: false
            });
            loadingSpinner = new THREE.Mesh(spinnerGeo, spinnerMat);
            loadingSpinner.position.set(0, 0.25, 0.1);
            loadingSpinner.renderOrder = 10001; // Higher
            loadingGroup.add(loadingSpinner);

            // Text Panel
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512; // Taller for wrapped text
            const context = canvas.getContext('2d')!;

            const texture = new THREE.CanvasTexture(canvas);
            const textGeo = new THREE.PlaneGeometry(2.5, 1.25); // Larger plane
            const textMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            loadingTextMesh = new THREE.Mesh(textGeo, textMat);
            loadingTextMesh.position.set(0, -0.2, 0);
            loadingTextMesh.renderOrder = 10000; // Base
            loadingGroup.add(loadingTextMesh);
            loadingTextMesh.name = "loading_text_panel";

            // Start Button
            const btnGeo = new THREE.BoxGeometry(0.6, 0.2, 0.05);
            const btnMat = new THREE.MeshBasicMaterial({
                color: 0x3b82f6, // Blue button
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            startButton = new THREE.Mesh(btnGeo, btnMat);
            startButton.name = "btn_start";
            startButton.position.set(0, -0.6, 0.1);
            startButton.visible = false;
            startButton.renderOrder = 10001; // Same as spinner level
            loadingGroup.add(startButton);

            // Start Button Label
            const btnCanvas = document.createElement('canvas');
            btnCanvas.width = 256;
            btnCanvas.height = 128;
            const btnCtx = btnCanvas.getContext('2d')!;
            btnCtx.fillStyle = '#3b82f6';
            btnCtx.fillRect(0, 0, 256, 128);
            btnCtx.font = 'bold 60px Arial';
            btnCtx.fillStyle = 'white';
            btnCtx.textAlign = 'center';
            btnCtx.textBaseline = 'middle';
            btnCtx.fillText('START', 128, 64);

            const btnTex = new THREE.CanvasTexture(btnCanvas);
            const btnLabelPlane = new THREE.PlaneGeometry(0.5, 0.15);
            const btnLabelMat = new THREE.MeshBasicMaterial({
                map: btnTex,
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            const btnLabelMesh = new THREE.Mesh(btnLabelPlane, btnLabelMat);
            btnLabelMesh.position.z = 0.03;
            btnLabelMesh.renderOrder = 10002; // Topmost
            startButton.add(btnLabelMesh);

            // Initial text
            updateLoadingDisplay('Initializing VR...', true);
        }

        function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
            const words = text.split(' ');
            let line = '';
            let lines = [];

            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = context.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            // Center all lines relative to the starting Y
            const totalHeight = lines.length * lineHeight;
            let currentY = y - (totalHeight / 2) + (lineHeight / 2);

            for (let i = 0; i < lines.length; i++) {
                context.fillText(lines[i], x, currentY);
                currentY += lineHeight;
            }
        }

        function drawPanelBackground(context: CanvasRenderingContext2D, width: number, height: number, radius: number) {
            context.fillStyle = 'rgba(5, 10, 20, 0.9)'; // Dark Navy Background from image
            context.beginPath();
            context.moveTo(radius, 0);
            context.lineTo(width - radius, 0);
            context.quadraticCurveTo(width, 0, width, radius);
            context.lineTo(width, height - radius);
            context.quadraticCurveTo(width, height, width - radius, height);
            context.lineTo(radius, height);
            context.quadraticCurveTo(0, height, 0, height - radius);
            context.lineTo(0, radius);
            context.quadraticCurveTo(0, 0, radius, 0);
            context.closePath();
            context.fill();

            // White border
            context.strokeStyle = 'white';
            context.lineWidth = 8;
            context.stroke();
        }

        function updateLoadingDisplay(text: string, showSpinner: boolean = true) {
            if (!loadingTextMesh) return;
            const material = loadingTextMesh.material as THREE.MeshBasicMaterial;
            const canvas = (material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
            const context = canvas.getContext('2d')!;

            context.clearRect(0, 0, 1024, 512);
            drawPanelBackground(context, 1024, 512, 40);

            context.font = 'Bold 48px Inter, Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            wrapText(context, text, 512, 256, 900, 60);

            (material.map as THREE.CanvasTexture).needsUpdate = true;
            if (loadingSpinner) loadingSpinner.visible = showSpinner;
        }

        function updateLoadingText(text: string) {
            updateLoadingDisplay(text, true);
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

                isLoading = false;
                updateStepUI();

                // Show controllers and hands
                controller1.visible = true;
                controller2.visible = true;
                controllerGrip1.visible = true;
                controllerGrip2.visible = true;
                hand1.visible = true;
                hand2.visible = true;

                // Load ghost hints/anchors for the first step if needed
                updateGhostHints();

            } catch (error) {
                console.error('Error in loadModels:', error);
                updateLoadingText('Error loading models');
            }
        }

        function updateStepUI() {
            if (!project || !project.steps) return;

            if (completed) {
                updateLoadingDisplay('Congratulations! Lesson Complete', false);
                if (startButton) startButton.visible = false;
                return;
            }

            const currentStep = project.steps[currentStepIndex];

            if (!isStarted) {
                // Show text from step 1 even if not started
                const introStep = project.steps[0];
                const introText = introStep ? `${introStep.title}: ${introStep.instruction}` : 'Welcome to the Lesson! Press Start to Begin.';
                updateLoadingDisplay(introText, false);
                if (startButton) startButton.visible = true;
                return;
            }

            if (currentStep) {
                updateLoadingDisplay(`${currentStep.title}: ${currentStep.instruction}`, isLoading);
                if (startButton) startButton.visible = false;
            }
        }

        function updateGhostHints() {
            // Remove existing ghosts
            scene.children.filter(c => c.name.startsWith('ghost_')).forEach(c => scene.remove(c));

            if (completed || !project || !project.steps) return;
            const currentStep = project.steps[currentStepIndex];
            if (currentStep?.targetAction === 'move') {
                let targetPos: THREE.Vector3 | null = null;

                if (currentStep.snapAnchorId) {
                    const anchor = sessionAssets.find(a => a.id === currentStep.snapAnchorId);
                    if (anchor) targetPos = new THREE.Vector3(...anchor.position);
                } else if (currentStep.targetPosition) {
                    targetPos = new THREE.Vector3(...currentStep.targetPosition);
                }

                if (targetPos) {
                    const targetAsset = sessionAssets.find(a => a.id === currentStep.targetAssetId);
                    if (targetAsset && targetAsset.url) {
                        const loader = new GLTFLoader();
                        loader.load(targetAsset.url, (gltf) => {
                            const ghost = gltf.scene;
                            ghost.name = `ghost_${targetAsset.id}`;
                            ghost.position.copy(targetPos!);
                            if (targetAsset.rotation) ghost.rotation.set(...(targetAsset.rotation as [number, number, number]));
                            if (targetAsset.scale) ghost.scale.set(...(targetAsset.scale as [number, number, number]));

                            ghost.traverse(child => {
                                if ((child as THREE.Mesh).isMesh) {
                                    const m = child as THREE.Mesh;
                                    m.material = new THREE.MeshBasicMaterial({
                                        color: 0x10b981,
                                        transparent: true,
                                        opacity: 0.2,
                                        wireframe: true
                                    });
                                }
                            });
                            scene.add(ghost);

                            // ADD "Place Here" Label
                            const labelCanvas = document.createElement('canvas');
                            labelCanvas.width = 256;
                            labelCanvas.height = 64;
                            const labelCtx = labelCanvas.getContext('2d')!;
                            labelCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                            labelCtx.fillRect(0, 0, 256, 64);
                            labelCtx.font = 'bold 30px Arial';
                            labelCtx.fillStyle = '#10b981';
                            labelCtx.textAlign = 'center';
                            labelCtx.textBaseline = 'middle';
                            labelCtx.fillText('PLACE HERE', 128, 32);

                            const labelTex = new THREE.CanvasTexture(labelCanvas);
                            const labelPlane = new THREE.PlaneGeometry(0.5, 0.125);
                            const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false });
                            const labelMesh = new THREE.Mesh(labelPlane, labelMat);
                            labelMesh.position.set(0, 0.2, 0); // Above the ghost
                            labelMesh.name = `ghost_label_${targetAsset.id}`;
                            ghost.add(labelMesh);
                        });
                    }
                }
            }
        }

        function handleNext() {
            if (!project || !project.steps) {
                completed = true;
                updateStepUI();
                updateGhostHints();
                return;
            }

            if (currentStepIndex < project.steps.length - 1) {
                currentStepIndex++;
                updateStepUI();
                updateGhostHints();
            } else {
                completed = true;
                updateStepUI();
                updateGhostHints();
            }
        }

        function onSelectStart(event: any) {
            if (isLoading || completed || !project || !project.steps) return;
            const controller = event.target;

            // Raycast logic
            const tempMatrix = new THREE.Matrix4();
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            const raycaster = new THREE.Raycaster();
            raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                for (const hit of intersects) {
                    let targetObj = hit.object;
                    while (targetObj && !targetObj.name && targetObj.parent) {
                        targetObj = targetObj.parent;
                    }

                    const assetId = targetObj.name;
                    const currentStep = project.steps[currentStepIndex];

                    // Handle START Button
                    if (assetId === "btn_start") {
                        isStarted = true;
                        handleNext(); // Move to next step immediately after start
                        return;
                    }

                    if (isStarted && assetId && currentStep && assetId === currentStep.targetAssetId) {
                        if (currentStep.targetAction === 'click') {
                            handleNext();
                            return;
                        } else if (currentStep.targetAction === 'move' && !holdingAssetId) {
                            holdingAssetId = assetId;
                            holdingHand = controller;
                            return;
                        }
                    }
                }
            }
        }

        function onSelectEnd() {
            holdingAssetId = null;
            holdingHand = null;
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
            controller1.addEventListener('selectstart', onSelectStart);
            controller1.addEventListener('selectend', onSelectEnd);
            userGroup.add(controller1);

            controller2 = renderer.xr.getController(1);
            controller2.visible = false;
            controller2.addEventListener('selectstart', onSelectStart);
            controller2.addEventListener('selectend', onSelectEnd);
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
        const _holdPos = new THREE.Vector3();

        function handleLocomotion(delta: number) {
            if (isLoading) return;

            // Movement logic...

            // Interaction: Carrying Logic
            if (holdingAssetId && holdingHand && project && project.steps) {
                const heldObj = scene.getObjectByName(holdingAssetId);
                if (heldObj) {
                    // Object follows controller at a slight offset
                    _holdPos.set(0, 0, -0.3).applyMatrix4(holdingHand.matrixWorld);
                    heldObj.position.copy(_holdPos);

                    // Check for snapping
                    const currentStep = project.steps[currentStepIndex];
                    let targetPos: THREE.Vector3 | null = null;

                    if (currentStep.snapAnchorId) {
                        const anchor = sessionAssets.find(a => a.id === currentStep.snapAnchorId);
                        if (anchor) targetPos = new THREE.Vector3(...anchor.position);
                    } else if (currentStep.targetPosition) {
                        targetPos = new THREE.Vector3(...currentStep.targetPosition);
                    }

                    if (targetPos && _holdPos.distanceTo(targetPos) < 0.2) {
                        // Snap!
                        heldObj.position.copy(targetPos);
                        const asset = sessionAssets.find(a => a.id === holdingAssetId);
                        if (asset) asset.position = [targetPos.x, targetPos.y, targetPos.z];

                        holdingAssetId = null;
                        holdingHand = null;
                        handleNext();
                    }
                }
            }

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

            if (controller1) {
                controller1.removeEventListener('selectstart', onSelectStart);
                controller1.removeEventListener('selectend', onSelectEnd);
            }
            if (controller2) {
                controller2.removeEventListener('selectstart', onSelectStart);
                controller2.removeEventListener('selectend', onSelectEnd);
            }

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
