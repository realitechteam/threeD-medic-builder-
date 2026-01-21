
// @ts-nocheck
import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Environment, ContactShadows, Text, useGLTF, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { Asset, Vector3Tuple } from '../types';
import { Loader2, User } from 'lucide-react';

interface ViewportProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onAssetUpdate: (id: string, updates: Partial<Asset>) => void;
  onSelectAsset: (id: string | null) => void;
  onDropAsset: (type: string, subType: string | null, position: Vector3Tuple, url?: string) => void;
}

const CustomModel: React.FC<{
  asset: Asset;
  onPointerDown: (e: any) => void;
  onClick: (e: any) => void;
  onRef: (el: THREE.Object3D) => void
}> = ({ asset, onPointerDown, onClick, onRef }) => {
  const { scene } = useGLTF(asset.url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <primitive
      object={clonedScene}
      position={asset.position}
      rotation={asset.rotation}
      scale={asset.scale}
      visible={asset.visible !== false}
      onPointerDown={asset.visible !== false ? onPointerDown : undefined}
      onClick={asset.visible !== false ? onClick : undefined}
      ref={onRef}
    />
  );
};


const PlayerStartMesh: React.FC<{
  asset: Asset;
  onPointerDown: (e: any) => void;
  onClick: (e: any) => void;
  onRef: (el: THREE.Object3D) => void
}> = ({ asset, onPointerDown, onClick, onRef }) => {
  return (
    <group
      position={asset.position}
      rotation={asset.rotation}
      scale={asset.scale}
      ref={onRef}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {/* Body capsule */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.4, 1, 4, 16]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.2} transparent opacity={0.8} />
      </mesh>
      {/* Eye/Visor to show direction */}
      <mesh position={[0, 1.4, -0.3]}>
        <boxGeometry args={[0.5, 0.15, 0.1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Indicator icon */}
      <Html position={[0, 2.2, 0]} center>
        <div className="bg-indigo-600 p-1 rounded-full text-white shadow-lg animate-bounce">
          <User size={12} />
        </div>
      </Html>
    </group>
  );
};

const LoaderUI = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 bg-slate-900/90 p-8 rounded-[2rem] border border-slate-700 shadow-2xl backdrop-blur-xl min-w-[200px]">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
            {Math.round(progress)}%
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white uppercase tracking-widest">Loading Model</p>
          <p className="text-[10px] text-slate-500 font-medium">Preparing 3D geometry...</p>
        </div>
      </div>
    </Html>
  );
};

const SceneContent: React.FC<ViewportProps> = ({ assets, selectedAssetId, onAssetUpdate, onSelectAsset }) => {
  const { scene } = useThree();
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
  const meshRefs = useRef<{ [key: string]: THREE.Object3D }>({});

  // Ref để theo dõi vị trí chuột khi nhấn xuống nhằm tránh click nhầm khi xoay camera
  const pointerDownPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'w') setTransformMode('translate');
      if (e.key === 'e') setTransformMode('rotate');
      if (e.key === 'r') setTransformMode('scale');
      if (e.key === 'Escape') onSelectAsset(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectAsset]);

  // Hàm xử lý việc xác định xem có nên thực hiện Select hay không
  const handleInteraction = (assetId: string, event: any) => {
    if (!pointerDownPos.current) return;

    const moveThreshold = 5; // pixel
    const deltaX = Math.abs(event.clientX - pointerDownPos.current.x);
    const deltaY = Math.abs(event.clientY - pointerDownPos.current.y);

    // Nếu chuột di chuyển ít hơn threshold thì mới coi là Click chọn vật thể
    if (deltaX < moveThreshold && deltaY < moveThreshold) {
      onSelectAsset(assetId);
    }
    pointerDownPos.current = null;
  };

  const onPointerDown = (e: any) => {
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  // Hide Gizmo if selected asset is hidden
  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const showGizmo = selectedAssetId && meshRefs.current[selectedAssetId] && selectedAsset?.visible !== false;

  return (
    <>
      <OrbitControls makeDefault enabled={!isDraggingGizmo} />

      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <gridHelper args={[20, 20, 0x444444, 0x222222]} />

      <Suspense fallback={<LoaderUI />}>
        {assets.map((asset) => (
          <React.Fragment key={asset.id}>
            {asset.type === 'shape' && (
              <mesh
                ref={(el) => { if (el) meshRefs.current[asset.id] = el; }}
                position={asset.position}
                rotation={asset.rotation}
                scale={asset.scale}
                visible={asset.visible !== false}
                onPointerDown={asset.visible !== false ? onPointerDown : undefined}
                onClick={(e) => {
                  if (asset.visible !== false && !asset.locked) {
                    e.stopPropagation();
                    handleInteraction(asset.id, e);
                  }
                }}
              >
                {asset.geometryType === 'box' && <boxGeometry args={[1, 1, 1]} />}
                {asset.geometryType === 'sphere' && <sphereGeometry args={[0.7, 32, 32]} />}
                {asset.geometryType === 'cone' && <coneGeometry args={[0.7, 1.5, 32]} />}
                {asset.geometryType === 'torus' && <torusGeometry args={[0.5, 0.2, 16, 100]} />}
                <meshStandardMaterial color={asset.color} roughness={0.3} metalness={0.2} />
              </mesh>
            )}

            {asset.type === 'text' && (
              <Text
                ref={(el) => { if (el) meshRefs.current[asset.id] = el; }}
                position={asset.position}
                rotation={asset.rotation}
                scale={asset.scale}
                visible={asset.visible !== false}
                fontSize={0.5}
                color={asset.color}
                anchorX="center"
                anchorY="middle"
                onPointerDown={asset.visible !== false ? onPointerDown : undefined}
                onClick={(e) => {
                  if (asset.visible !== false && !asset.locked) {
                    e.stopPropagation();
                    handleInteraction(asset.id, e);
                  }
                }}
              >
                {asset.content || 'Text'}
              </Text>
            )}

            {asset.type === 'model' && asset.url && (
              <CustomModel
                asset={asset}
                onRef={(el) => { if (el) meshRefs.current[asset.id] = el; }}
                onPointerDown={onPointerDown}
                onClick={(e) => {
                  if (!asset.locked) {
                    e.stopPropagation();
                    handleInteraction(asset.id, e);
                  }
                }}
              />
            )}

            {asset.type === 'player_start' && (
              <PlayerStartMesh
                asset={asset}
                onRef={(el) => { if (el) meshRefs.current[asset.id] = el; }}
                onPointerDown={onPointerDown}
                onClick={(e) => {
                  if (!asset.locked) {
                    e.stopPropagation();
                    handleInteraction(asset.id, e);
                  }
                }}
              />
            )}
          </React.Fragment>
        ))}
      </Suspense>

      {showGizmo && (
        <TransformControls
          object={meshRefs.current[selectedAssetId]}
          mode={transformMode}
          onMouseDown={() => setIsDraggingGizmo(true)}
          onMouseUp={() => {
            setIsDraggingGizmo(false);
            const obj = meshRefs.current[selectedAssetId];
            if (obj) {
              onAssetUpdate(selectedAssetId, {
                position: [obj.position.x, obj.position.y, obj.position.z],
                rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                scale: [obj.scale.x, obj.scale.y, obj.scale.z]
              });
            }
          }}
        />
      )}

      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2.4} />
    </>
  );
};

const Viewport: React.FC<ViewportProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full cursor-crosshair relative transition-colors ${isDraggingOver ? 'bg-blue-500/10' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const assetType = e.dataTransfer.getData('assetType');
        const subType = e.dataTransfer.getData('subType');
        const assetUrl = e.dataTransfer.getData('assetUrl');

        if (assetType) {
          window.dispatchEvent(new CustomEvent('asset-dropped', {
            detail: {
              type: assetType,
              subType,
              url: assetUrl,
              clientX: e.clientX,
              clientY: e.clientY
            }
          }));
        }
      }}
    >
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneContent {...props} />
        <DropHandler onDrop={props.onDropAsset} />
      </Canvas>

      {props.selectedAssetId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl px-6 py-3 flex items-center gap-8 text-xs text-slate-300 font-mono shadow-2xl z-20">
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-2"> <kbd className="bg-slate-700 px-2 py-0.5 rounded text-white">W</kbd> <span className="text-[10px] uppercase font-bold text-slate-500">Move</span> </span>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-2"> <kbd className="bg-slate-700 px-2 py-0.5 rounded text-white">E</kbd> <span className="text-[10px] uppercase font-bold text-slate-500">Rotate</span> </span>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-2"> <kbd className="bg-slate-700 px-2 py-0.5 rounded text-white">R</kbd> <span className="text-[10px] uppercase font-bold text-slate-500">Scale</span> </span>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <button
            onClick={() => props.onSelectAsset(null)}
            className="text-red-400 hover:text-red-300 font-bold uppercase text-[10px] tracking-widest ml-2"
          >
            Deselect
          </button>
        </div>
      )}

      {isDraggingOver && (
        <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-blue-500/30 flex items-center justify-center bg-blue-500/5 z-10">
          <div className="bg-blue-600 px-8 py-4 rounded-3xl text-white font-bold text-lg shadow-2xl animate-bounce">
            Drop to Place Object
          </div>
        </div>
      )}
    </div>
  );
};

const DropHandler = ({ onDrop }: { onDrop: (type: string, subType: string | null, pos: Vector3Tuple, url?: string) => void }) => {
  const { camera, gl } = useThree();

  useEffect(() => {
    const handleDropped = (e: any) => {
      const { type, subType, url, clientX, clientY } = e.detail;
      const rect = gl.domElement.getBoundingClientRect();

      const mouse = new THREE.Vector2();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const targetPos = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(plane, targetPos)) {
        onDrop(type, subType, [targetPos.x, targetPos.y, targetPos.z], url);
      } else {
        onDrop(type, subType, [0, 0, 0], url);
      }
    };

    window.addEventListener('asset-dropped', handleDropped);
    return () => window.removeEventListener('asset-dropped', handleDropped);
  }, [camera, gl, onDrop]);

  return null;
};

export default Viewport;
