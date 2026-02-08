
import React, { useRef, useState, useEffect } from 'react';
import { Box, Type, Circle, Triangle, Layers, Upload, Loader2, User, ChevronDown, ChevronRight, Watch, Gem } from 'lucide-react';
import { Asset } from '../types';

interface SidebarProps {
  onAddAsset: (type: Asset['type'], subType?: any, position?: [number, number, number], url?: string) => void;
  hasPlayerStart?: boolean;
}

interface ModelConfig {
  label: string;
  icon: string;
  subType?: string;
  url?: string;
}

interface ModelsData {
  shapes: ModelConfig[];
  humanModels: ModelConfig[];
  facilityModels: ModelConfig[];
  roomModels: ModelConfig[];
  jewelryModels: ModelConfig[];
}

const Sidebar: React.FC<SidebarProps> = ({ onAddAsset, hasPlayerStart = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shapes, setShapes] = useState<any[]>([]);
  const [humanModels, setHumanModels] = useState<any[]>([]);
  const [facilityModels, setFacilityModels] = useState<any[]>([]);
  const [roomModels, setRoomModels] = useState<any[]>([]);
  const [jewelryModels, setJewelryModels] = useState<any[]>([]);
  const [isFacilityExpanded, setIsFacilityExpanded] = useState(true);
  const [isRoomExpanded, setIsRoomExpanded] = useState(true);
  const [isJewelryExpanded, setIsJewelryExpanded] = useState(true);

  // Icon mapping
  const iconMap: { [key: string]: React.ReactNode } = {
    Box: <Box />,
    Circle: <Circle />,
    Triangle: <Triangle />,
    Layers: <Layers />,
    User: <User />,
    Watch: <Watch />,
    Gem: <Gem />,
  };

  // Load models from JSON
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/data/models-config.json');
        const data: ModelsData = await response.json();

        // Map icon names to actual icon components
        setShapes(data.shapes.map(item => ({ ...item, icon: iconMap[item.icon] })));
        setHumanModels(data.humanModels.map(item => ({ ...item, icon: iconMap[item.icon] })));
        setFacilityModels(data.facilityModels.map(item => ({ ...item, icon: iconMap[item.icon] })));
        setRoomModels(data.roomModels.map(item => ({ ...item, icon: iconMap[item.icon] })));
        setJewelryModels(data.jewelryModels.map(item => ({ ...item, icon: iconMap[item.icon] })));
      } catch (error) {
        console.error('Failed to load models config:', error);
        // Fallback to empty arrays
        setShapes([]);
        setHumanModels([]);
        setFacilityModels([]);
        setRoomModels([]);
        setJewelryModels([]);
      }
    };

    loadModels();
  }, []);

  const handleDragStart = (e: React.DragEvent, type: string, subType?: string, url?: string, label?: string) => {
    if (type === 'player_start' && hasPlayerStart) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('assetType', type);
    if (subType) e.dataTransfer.setData('subType', subType);
    if (url) e.dataTransfer.setData('assetUrl', url);
    if (label) e.dataTransfer.setData('assetLabel', label);
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
          draggable={!hasPlayerStart}
          onDragStart={(e) => handleDragStart(e, 'player_start')}

          disabled={hasPlayerStart}
          className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all group ${hasPlayerStart
            ? 'bg-slate-800/50 border border-slate-700/50 cursor-not-allowed opacity-50'
            : 'bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 cursor-grab active:cursor-grabbing'
            }`}
        >
          <div className={`p-2 rounded-lg text-white transition-transform ${hasPlayerStart ? 'bg-slate-600' : 'bg-indigo-500 group-hover:scale-110 pointer-events-none'}`}>
            <User size={20} />
          </div>
          <div className="text-left pointer-events-none">
            <span className={`block text-sm font-bold ${hasPlayerStart ? 'text-slate-500' : 'text-indigo-400'}`}>
              {hasPlayerStart ? 'Player Spawn (Active)' : 'Player Spawn'}
            </span>
            <span className={`block text-[10px] ${hasPlayerStart ? 'text-slate-600' : 'text-indigo-500/70'}`}>
              {hasPlayerStart ? 'Already in scene' : 'Student starting position'}
            </span>
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

              className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 group cursor-grab active:cursor-grabbing"
            >
              <div className="text-blue-400 mb-2 group-hover:scale-110 transition-transform pointer-events-none">{shape.icon}</div>
              <span className="text-xs font-medium text-slate-300 pointer-events-none">{shape.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Human</h4>
          <span className="text-[10px] text-slate-600 italic">Drag to scene</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {humanModels.map((model) => (
            <button
              key={model.label}
              draggable
              onDragStart={(e) => handleDragStart(e, 'model', 'human', model.url, model.label)}

              className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 group cursor-grab active:cursor-grabbing"
            >
              <div className="text-blue-400 mb-2 group-hover:scale-110 transition-transform pointer-events-none">{model.icon}</div>
              <span className="text-xs font-medium text-slate-300 pointer-events-none">{model.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div
          className="flex items-center justify-between mb-4 cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors"
          onClick={() => setIsFacilityExpanded(!isFacilityExpanded)}
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Facility Models</h4>
            {isFacilityExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          </div>
          <span className="text-[10px] text-slate-600 italic">Drag to scene</span>
        </div>

        {isFacilityExpanded && (
          <div className="grid grid-cols-2 gap-2">
            {facilityModels.map((model) => (
              <button
                key={model.label}
                draggable
                onDragStart={(e) => handleDragStart(e, 'model', 'facility', model.url, model.label)}

                className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 group cursor-grab active:cursor-grabbing"
              >
                <div className="text-green-400 mb-2 group-hover:scale-110 transition-transform pointer-events-none">{model.icon}</div>
                <span className="text-xs font-medium text-slate-300 pointer-events-none">{model.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div
          className="flex items-center justify-between mb-4 cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors"
          onClick={() => setIsRoomExpanded(!isRoomExpanded)}
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Room Models</h4>
            {isRoomExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          </div>
          <span className="text-[10px] text-slate-600 italic">Drag to scene</span>
        </div>

        {isRoomExpanded && (
          <div className="grid grid-cols-2 gap-2">
            {roomModels.map((model) => (
              <button
                key={model.label}
                draggable
                onDragStart={(e) => handleDragStart(e, 'model', 'room', model.url, model.label)}

                className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 group cursor-grab active:cursor-grabbing"
              >
                <div className="text-purple-400 mb-2 group-hover:scale-110 transition-transform pointer-events-none">{model.icon}</div>
                <span className="text-xs font-medium text-slate-300 pointer-events-none">{model.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div
          className="flex items-center justify-between mb-4 cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors"
          onClick={() => setIsJewelryExpanded(!isJewelryExpanded)}
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jewelry Models</h4>
            {isJewelryExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          </div>
          <span className="text-[10px] text-slate-600 italic">Drag to scene</span>
        </div>

        {isJewelryExpanded && (
          <div className="grid grid-cols-2 gap-2">
            {jewelryModels.map((model) => (
              <button
                key={model.label}
                draggable
                onDragStart={(e) => handleDragStart(e, 'model', 'jewelry', model.url, model.label)}

                className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95 group cursor-grab active:cursor-grabbing"
              >
                <div className="text-amber-400 mb-2 group-hover:scale-110 transition-transform pointer-events-none">{model.icon}</div>
                <span className="text-xs font-medium text-slate-300 pointer-events-none">{model.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Text & Labels</h4>
        <button
          draggable
          onDragStart={(e) => handleDragStart(e, 'text')}

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

      <section className="mt-8 pt-8 border-t border-slate-800">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-[11px] text-blue-400 leading-relaxed italic">
            "Tip: You can upload your own GLB files (biology, chemistry, etc.) to create specialized learning content."
          </p>
        </div>
      </section>
    </div>
  );
};

export default Sidebar;
