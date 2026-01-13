
import React, { useRef, useState } from 'react';
import { Box, Type, Circle, Triangle, Layers, Upload, Loader2, User, HelpCircle } from 'lucide-react';
import { Asset } from '../types';

interface SidebarProps {
  onAddAsset: (type: Asset['type'], subType?: any, position?: [number, number, number], url?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddAsset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const shapes = [
    { label: 'Cube', icon: <Box />, subType: 'box' },
    { label: 'Sphere', icon: <Circle />, subType: 'sphere' },
    { label: 'Cone', icon: <Triangle />, subType: 'cone' },
    { label: 'Torus', icon: <Layers />, subType: 'torus' },
  ];

  const handleDragStart = (e: React.DragEvent, type: string, subType?: string) => {
    e.dataTransfer.setData('assetType', type);
    if (subType) e.dataTransfer.setData('subType', subType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onAddAsset('model', 'custom', [0, 0, 0], base64);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <section>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Classroom Actors</h4>
        <button
          draggable
          onDragStart={(e) => handleDragStart(e, 'player_start')}
          onClick={() => onAddAsset('player_start')}
          className="w-full flex items-center gap-4 p-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-xl transition-all group cursor-grab active:cursor-grabbing"
        >
          <div className="bg-indigo-500 p-2 rounded-lg text-white group-hover:scale-110 transition-transform pointer-events-none">
            <User size={20} />
          </div>
          <div className="text-left pointer-events-none">
            <span className="block text-sm font-bold text-indigo-400">Player Spawn</span>
            <span className="block text-[10px] text-indigo-500/70">Student starting position</span>
          </div>
        </button>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Geometric Shapes</h4>
          <span className="text-[10px] text-slate-600 italic">Drag to scene</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {shapes.map((shape) => (
            <button
              key={shape.label}
              draggable
              onDragStart={(e) => handleDragStart(e, 'shape', shape.subType)}
              onClick={() => onAddAsset('shape', shape.subType)}
              className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 group cursor-grab active:cursor-grabbing"
            >
              <div className="text-blue-400 mb-2 group-hover:scale-110 transition-transform pointer-events-none">{shape.icon}</div>
              <span className="text-xs font-medium text-slate-300 pointer-events-none">{shape.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Text & Labels</h4>
        <button
          draggable
          onDragStart={(e) => handleDragStart(e, 'text')}
          onClick={() => onAddAsset('text')}
          className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group cursor-grab active:cursor-grabbing"
        >
          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors pointer-events-none">
            <Type size={20} />
          </div>
          <div className="text-left pointer-events-none">
            <span className="block text-sm font-bold text-slate-200">3D Label</span>
            <span className="block text-[10px] text-slate-500">Floating annotation</span>
          </div>
        </button>
      </section>

      <section>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Advanced Models</h4>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".glb,.gltf" 
          onChange={handleFileUpload}
        />
        <button
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-4 p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl transition-all group relative overflow-hidden"
        >
          <div className="bg-blue-500 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          </div>
          <div className="text-left">
            <span className="block text-sm font-bold text-blue-400">Upload .GLB</span>
            <span className="block text-[10px] text-blue-500/70">Load custom 3D model</span>
          </div>
          {isUploading && (
             <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[1px]">
               <div className="h-1 w-full absolute bottom-0 bg-blue-500 animate-pulse" />
             </div>
          )}
        </button>
      </section>
    </div>
  );
};

export default Sidebar;
