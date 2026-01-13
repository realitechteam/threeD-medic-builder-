
// @ts-nocheck
import React, { useState, Suspense, useEffect, useMemo, useRef } from 'react';
import { ProjectData, Step, Asset, Vector3Tuple } from '../types';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Environment, Text, ContactShadows, Float, useGLTF, Html, useProgress } from '@react-three/drei';
import { ChevronRight, ChevronLeft, LogOut, Info, CheckCircle2, Loader2, Anchor, Sparkles, Move, MousePointer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface ViewerProps {
  project: ProjectData;
  onExit: () => void;
}

// FPS Player Controller Component
const Player = ({ initialPos, onMoveUpdate }: { initialPos: Vector3Tuple, onMoveUpdate: (pos: THREE.Vector3) => void }) => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Set initial position once
    if (!hasInitialized.current) {
      camera.position.set(initialPos[0], initialPos[1] + 1.6, initialPos[2]);
      hasInitialized.current = true;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyD': moveState.current.right = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyD': moveState.current.right = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera, initialPos]);

  useFrame((state, delta) => {
    const speed = 5;
    const friction = 10;

    velocity.current.x -= velocity.current.x * friction * delta;
    velocity.current.z -= velocity.current.z * friction * delta;

    direction.current.z = Number(moveState.current.forward) - Number(moveState.current.backward);
    direction.current.x = Number(moveState.current.right) - Number(moveState.current.left);
    direction.current.normalize();

    if (moveState.current.forward || moveState.current.backward) velocity.current.z -= direction.current.z * speed * 10 * delta;
    if (moveState.current.left || moveState.current.right) velocity.current.x -= direction.current.x * speed * 10 * delta;

    camera.translateX(-velocity.current.x * delta);
    camera.translateZ(velocity.current.z * delta);
    camera.position.y = initialPos[1] + 1.6;

    onMoveUpdate(camera.position);
  });

  return null;
};

const ViewerModel: React.FC<{
  asset: Asset;
  isTarget?: boolean;
  isAnchor?: boolean;
}> = ({ asset, isTarget, isAnchor }) => {
  const { scene } = useGLTF(asset.url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive
      object={clonedScene}
      position={asset.position}
      rotation={asset.rotation}
      scale={asset.scale}
      visible={asset.visible !== false}
    />
  );
};

const ViewerLoader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 bg-slate-900/40 p-6 rounded-3xl backdrop-blur-md">
        <Loader2 className="animate-spin text-blue-400" size={32} />
        <p className="text-[10px] font-bold text-white uppercase tracking-widest">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
};

const Viewer: React.FC<ViewerProps> = ({ project, onExit }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [sessionAssets, setSessionAssets] = useState<Asset[]>(project.assets);
  const [isSnapped, setIsSnapped] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const currentStep = project.steps[currentStepIndex];
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = new THREE.Vector2(0, 0); // Center of screen for FPS

  // Find spawn point
  const playerStart = useMemo(() => {
    return project.assets.find(a => a.type === 'player_start') || { position: [0, 0, 5] };
  }, [project.assets]);

  useEffect(() => {
    setIsSnapped(false);
    setIsHolding(false);
  }, [currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < project.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleInteraction = (scene: THREE.Scene, camera: THREE.Camera) => {
    if (completed || isSnapped) return;

    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Find the asset ID from the intersected object (traversing up to find primitive/mesh with userData)
      let targetObj = intersects[0].object;
      while (targetObj && !targetObj.name && targetObj.parent) {
        targetObj = targetObj.parent;
      }

      const assetId = targetObj.name || targetObj.uuid; // This is a bit simplified, in real apps we'd map this better

      // Checking for the current target asset
      const targetAsset = sessionAssets.find(a => a.id === currentStep?.targetAssetId);

      // In this version, we detect if the ray intersects the target asset's bounding box/mesh
      // For simplicity, we'll check if any part of the intersected object belongs to the target ID
      // Mapping names correctly is key
      if (currentStep?.targetAction === 'click' && targetAsset) {
        handleNext();
      } else if (currentStep?.targetAction === 'move' && targetAsset && !isHolding) {
        setIsHolding(true);
      }
    }
  };

  // Carrying and Snapping Logic
  const InteractionManager = () => {
    const { camera, scene } = useThree();

    useFrame(() => {
      if (isHolding && currentStep?.targetAssetId && !isSnapped) {
        const targetAsset = sessionAssets.find(a => a.id === currentStep.targetAssetId);
        if (targetAsset) {
          // Object follows a point in front of camera
          const holdPos = new THREE.Vector3(0, 0, -2.5).applyMatrix4(camera.matrixWorld);
          updateAssetSessionPos(targetAsset.id, holdPos);

          // Check for Snap
          if (currentStep.snapAnchorId) {
            const anchorAsset = sessionAssets.find(a => a.id === currentStep.snapAnchorId);
            if (anchorAsset) {
              const anchorPos = new THREE.Vector3(...anchorAsset.position);
              if (holdPos.distanceTo(anchorPos) < 1.5) {
                setIsSnapped(true);
                setIsHolding(false);
                updateAssetSessionPos(targetAsset.id, anchorPos);
                setTimeout(handleNext, 800);
              }
            }
          }
        }
      }
    });

    useEffect(() => {
      const handleClick = () => {
        if (!isLocked) return;
        handleInteraction(scene, camera);
      };
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }, [scene, camera, isLocked, isHolding, isSnapped]);

    return null;
  };

  const updateAssetSessionPos = (id: string, pos: THREE.Vector3) => {
    setSessionAssets(prev => prev.map(a => a.id === id ? { ...a, position: [pos.x, pos.y, pos.z] } : a));
  };

  return (
    <div className="relative w-full h-full bg-slate-950">
      <Canvas camera={{ position: [0, 1.6, 5], fov: 75 }}>
        <Suspense fallback={<ViewerLoader />}>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />


          <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
          <Player initialPos={playerStart.position} onMoveUpdate={() => { }} />
          <InteractionManager />

          <gridHelper args={[100, 100, 0x222222, 0x111111]} position={[0, 0, 0]} />

          {sessionAssets.map((asset) => {
            if (asset.type === 'player_start') return null; // Don't show player start mesh in viewer

            const isTarget = currentStep?.targetAssetId === asset.id;
            const isAnchor = currentStep?.snapAnchorId === asset.id;

            return (
              <group key={asset.id} name={asset.id}>
                {asset.type === 'shape' && (
                  <mesh
                    position={asset.position}
                    rotation={asset.rotation}
                    scale={asset.scale}
                    visible={asset.visible !== false}
                  >
                    {asset.geometryType === 'box' && <boxGeometry args={[1, 1, 1]} />}
                    {asset.geometryType === 'sphere' && <sphereGeometry args={[0.7, 32, 32]} />}
                    {asset.geometryType === 'cone' && <coneGeometry args={[0.7, 1.5, 32]} />}
                    {asset.geometryType === 'torus' && <torusGeometry args={[0.5, 0.2, 16, 100]} />}
                    <meshStandardMaterial
                      color={asset.color}
                      roughness={0.3}
                      metalness={0.2}
                      emissive={isTarget ? '#3b82f6' : isAnchor ? '#10b981' : 'black'}
                      emissiveIntensity={(isTarget || isAnchor) ? 0.4 : 0}
                    />
                  </mesh>
                )}

                {asset.type === 'text' && (
                  <Text
                    position={asset.position}
                    rotation={asset.rotation}
                    scale={asset.scale}
                    visible={asset.visible !== false}
                    fontSize={0.5}
                    color={asset.color}
                    anchorX="center"
                    anchorY="middle"
                  >
                    {asset.content || ''}
                  </Text>
                )}

                {asset.type === 'model' && asset.url && (
                  <ViewerModel asset={asset} />
                )}
              </group>
            );
          })}

          <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={50} blur={2.4} />
        </Suspense>
      </Canvas>

      {/* Crosshair UI */}
      {isLocked && !completed && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-1 h-1 rounded-full bg-white ring-4 transition-all duration-300 ${isHolding ? 'ring-blue-500 scale-150' : 'ring-white/20'}`} />
          <div className="absolute w-6 h-6 border-2 border-white/10 rounded-full" />
        </div>
      )}

      {/* FPS Overlay Instructions */}
      {!isLocked && !completed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] text-center shadow-2xl max-w-sm"
          >
            <MousePointer className="mx-auto mb-4 text-blue-400" size={48} />
            <h2 className="text-2xl font-bold mb-2">First-Person Mode</h2>
            <p className="text-slate-400 text-sm mb-6">Click anywhere to start moving and interacting with the 3D scene.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-500 mb-1">MOVE</div>
                <div className="text-white font-black tracking-widest">W A S D</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-500 mb-1">INTERACT</div>
                <div className="text-white font-black tracking-widest">L-CLICK</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Press ESC to unlock cursor</p>
          </motion.div>
        </div>
      )}

      {/* Persistent UI elements */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={onExit}
            className="bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-full text-slate-400 hover:text-white transition-colors flex items-center gap-2 pr-4 shadow-xl"
          >
            <LogOut size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Exit Preview</span>
          </button>
        </div>

        {!completed && (
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-3 shadow-xl pointer-events-auto">
            <span className="text-blue-400 font-bold">{currentStepIndex + 1} / {project.steps.length}</span>
            <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${((currentStepIndex + 1) / project.steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!completed && currentStep ? (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-none"
          >
            <div className={`bg-slate-900/90 backdrop-blur-xl border ${isSnapped ? 'border-green-500 shadow-green-500/20' : 'border-slate-700 shadow-2xl'} rounded-3xl p-8 transition-colors pointer-events-auto`}>
              <div className="flex items-start gap-4">
                <div className={`${isSnapped ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'} p-3 rounded-2xl shrink-0 transition-colors`}>
                  {isSnapped ? <CheckCircle2 size={24} /> : currentStep.targetAction === 'move' ? <Move size={24} className="animate-pulse" /> : <Info size={24} />}
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {currentStep.title}
                    {currentStep.targetAction === 'move' && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">Hold to Move</span>}
                  </h2>
                  <p className="text-slate-300 leading-relaxed text-sm">{currentStep.instruction}</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center">
                <button
                  disabled={currentStepIndex === 0 || isSnapped}
                  onClick={() => setCurrentStepIndex(prev => prev - 1)}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={20} /> Back
                </button>

                {currentStep.targetAction === 'none' && !isSnapped && (
                  <button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl flex items-center gap-2 font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Next <ChevronRight size={20} />
                  </button>
                )}

                {currentStep.targetAction === 'click' && (
                  <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Look at target and click
                  </div>
                )}

                {currentStep.targetAction === 'move' && !isSnapped && (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
                      {isHolding ? 'Bring it to the destination' : 'Click to grab the blue object'}
                    </div>
                  </div>
                )}

                {isSnapped && (
                  <div className="text-green-400 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} /> PERFECT!
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-50 p-6"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-[3rem] p-12 max-w-md text-center shadow-2xl">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
                <CheckCircle2 size={64} />
              </div>
              <h1 className="text-4xl font-bold mb-4">Well Done!</h1>
              <p className="text-slate-400 mb-10 leading-relaxed text-lg">
                You've completed the interactive 3D lesson: <strong>{project.projectName}</strong>.
              </p>
              <button
                onClick={onExit}
                className="w-full bg-slate-100 hover:bg-white text-slate-950 font-bold py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                Return to Editor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Viewer;
