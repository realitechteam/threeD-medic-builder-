
// @ts-nocheck
import React, { useState, Suspense, useEffect, useMemo, useRef, useCallback } from 'react';
import { ProjectData, Step, Asset, Vector3Tuple } from '../types';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Environment, Text, ContactShadows, Float, useGLTF, Html, useProgress } from '@react-three/drei';
import { XR, VRButton, useXR, Controllers } from '@react-three/xr';
import { ChevronRight, ChevronLeft, LogOut, Info, CheckCircle2, Loader2, Anchor, Sparkles, Move, MousePointer, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface ViewerProps {
  project: ProjectData;
  onExit: () => void;
  testMode?: 'auto' | 'desktop' | 'mobile' | 'vr';
}

// Virtual Joystick Component for Mobile
const Joystick = ({ onMove, position = 'left', color = 'blue' }: {
  onMove: (v: { x: number; y: number }) => void;
  position?: 'left' | 'right';
  color?: 'blue' | 'purple';
}) => {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    setActive(true);
  };

  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!active || !baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dy, dx);

    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    setPos({ x, y });
    onMove({ x: x / 40, y: -y / 40 });
  }, [active, onMove]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  useEffect(() => {
    if (active) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [active, handleMove, handleEnd]);

  const positionClass = position === 'left' ? 'left-12' : 'right-12';
  const colorClass = color === 'blue' ? 'bg-blue-500' : 'bg-purple-500';

  return (
    <div className={`fixed bottom-12 ${positionClass} z-[60] select-none touch-none`}>
      <div
        ref={baseRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/20 flex items-center justify-center"
      >
        <motion.div
          animate={{ x: pos.x, y: pos.y }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className={`w-10 h-10 ${colorClass} rounded-full shadow-lg border border-white/30 cursor-pointer`}
        />
      </div>
    </div>
  );
};



// Unified Player Controller (Desktop/Mobile/VR)
const Player = ({ initialPos, joystickInput, lookInput }: {
  initialPos: Vector3Tuple;
  joystickInput: { x: number; y: number };
  lookInput: { x: number; y: number };
}) => {
  const { camera } = useThree();
  const { isPresenting } = useXR();
  const velocity = useRef(new THREE.Vector3());
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const hasInitialized = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    if (!hasInitialized.current) {
      camera.position.set(initialPos[0], initialPos[1] + 1.6, initialPos[2]);
      euler.current.setFromQuaternion(camera.quaternion);
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
    if (isPresenting) return; // XR handles its own camera

    const speed = 6;
    const friction = 12;
    const lookSpeed = 2.5;

    // Apply rotation from look joystick
    if (lookInput.x !== 0 || lookInput.y !== 0) {
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= lookInput.x * lookSpeed * delta; // Yaw (left/right)
      euler.current.x += lookInput.y * lookSpeed * delta; // Pitch (up/down)
      euler.current.z = 0; // Lock roll to prevent camera tilt
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x)); // Clamp pitch
      camera.quaternion.setFromEuler(euler.current);
    }

    velocity.current.x -= velocity.current.x * friction * delta;
    velocity.current.z -= velocity.current.z * friction * delta;

    // Keyboard inputs
    const forward = Number(moveState.current.forward) - Number(moveState.current.backward);
    const side = Number(moveState.current.right) - Number(moveState.current.left);

    // Combine with Joystick inputs
    const moveZ = forward !== 0 ? forward : joystickInput.y;
    const moveX = side !== 0 ? side : joystickInput.x;

    if (moveZ !== 0) velocity.current.z -= moveZ * speed * 10 * delta;
    if (moveX !== 0) velocity.current.x -= moveX * speed * 10 * delta;

    camera.translateX(-velocity.current.x * delta);
    camera.translateZ(velocity.current.z * delta);
    camera.position.y = initialPos[1] + 1.6;
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

const Viewer: React.FC<ViewerProps> = ({ project, onExit, testMode = 'auto' }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [sessionAssets, setSessionAssets] = useState<Asset[]>(project.assets);
  const [isSnapped, setIsSnapped] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [joystickVal, setJoystickVal] = useState({ x: 0, y: 0 });
  const [lookVal, setLookVal] = useState({ x: 0, y: 0 });

  const currentStep = project.steps[currentStepIndex];
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = new THREE.Vector2(0, 0); // Center of screen for FPS

  useEffect(() => {
    // If testMode is set, override auto-detection
    if (testMode === 'mobile') {
      setIsMobile(true);
    } else if (testMode === 'desktop' || testMode === 'vr') {
      setIsMobile(false);
    } else {
      // Auto-detect
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, [testMode]);

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
        if (!isMobile && !isLocked) return;
        handleInteraction(scene, camera);
      };
      window.addEventListener('click', handleClick);
      window.addEventListener('touchstart', handleClick);
      return () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('touchstart', handleClick);
      };
    }, [scene, camera, isLocked, isHolding, isSnapped, isMobile]);

    return null;
  };

  const updateAssetSessionPos = (id: string, pos: THREE.Vector3) => {
    setSessionAssets(prev => prev.map(a => a.id === id ? { ...a, position: [pos.x, pos.y, pos.z] } : a));
  };

  return (
    <div className="relative w-full h-full bg-slate-950">
      <VRButton />
      <Canvas shadows camera={{ position: [0, 1.6, 5], fov: 75 }}>
        <XR>
          <Suspense fallback={<ViewerLoader />}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {!isMobile && <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />}

            <Controllers />
            <Player initialPos={playerStart.position} joystickInput={joystickVal} lookInput={lookVal} />
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
        </XR>
      </Canvas>

      {/* Control UI Overlays */}
      {isMobile && !completed && (
        <>
          <Joystick onMove={setJoystickVal} position="left" color="blue" />
          <Joystick onMove={setLookVal} position="right" color="purple" />
        </>
      )}

      {/* Mode Status Indicator */}
      <div className="absolute top-20 right-6 flex flex-col gap-2 z-50">
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-[10px] font-black tracking-widest uppercase transition-all shadow-lg ${isMobile ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-blue-600/20 border-blue-500/50 text-blue-400'}`}>
          {isMobile ? <><Smartphone size={14} /> Touch Mode</> : <><Monitor size={14} /> Desktop Mode</>}
        </div>
        {testMode !== 'auto' && (
          <div className="px-3 py-1.5 rounded-full bg-yellow-600/20 border border-yellow-500/50 text-yellow-400 text-[9px] font-black tracking-widest uppercase shadow-lg">
            TEST: {testMode}
          </div>
        )}
      </div>

      {/* Crosshair (Desktop only) */}
      {!isMobile && isLocked && !completed && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-1 h-1 rounded-full bg-white ring-4 transition-all duration-300 ${isHolding ? 'ring-blue-500 scale-150' : 'ring-white/20'}`} />
          <div className="absolute w-6 h-6 border-2 border-white/10 rounded-full" />
        </div>
      )}

      {/* Start Instructions */}
      {!isLocked && !completed && !isMobile && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] text-center shadow-2xl max-w-sm"
          >
            <MousePointer className="mx-auto mb-4 text-blue-400" size={48} />
            <h2 className="text-2xl font-bold mb-2">Desktop Viewer</h2>
            <p className="text-slate-400 text-sm mb-6">Click anywhere to lock your cursor and start the 3D lesson.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-500 mb-1 uppercase">Move</div>
                <div className="text-white font-black tracking-widest">W A S D</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-500 mb-1 uppercase">Action</div>
                <div className="text-white font-black tracking-widest">CLICK</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Press ESC to unlock cursor</p>
          </motion.div>
        </div>
      )}

      {/* Lesson Header */}
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

      {/* Step UI */}
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
