
import React from 'react';
import { Asset, Vector3Tuple } from '../types';
import { Eye, EyeOff, Shield, ShieldOff, Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  asset: Asset;
  onChange: (updates: Partial<Asset>) => void;
  onDelete: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ asset, onChange, onDelete }) => {
  const handleVectorChange = (key: 'position' | 'rotation' | 'scale', axis: number, value: string) => {
    const newVal = parseFloat(value);
    if (isNaN(newVal)) return;
    const current = [...asset[key]] as Vector3Tuple;
    current[axis] = newVal;
    onChange({ [key]: current });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold text-slate-500">Visibility</label>
        <button
          onClick={() => onChange({ visible: asset.visible === false ? true : false })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${asset.visible === false ? 'bg-slate-800 text-slate-400' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'}`}
        >
          {asset.visible === false ? <><EyeOff size={14} /> Hidden</> : <><Eye size={14} /> Visible</>}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold text-slate-500">Collision</label>
        <button
          onClick={() => onChange({ isCollidable: asset.isCollidable === false ? true : false })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${asset.isCollidable === false ? 'bg-slate-800 text-slate-400' : 'bg-green-600/20 text-green-400 border border-green-500/30'}`}
        >
          {asset.isCollidable === false ? <><ShieldOff size={14} /> Disabled</> : <><Shield size={14} /> Enabled</>}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold text-slate-500">Name</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
          value={asset.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      {asset.type === 'text' && (
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-500">Content</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 h-20 resize-none"
            value={asset.content}
            onChange={(e) => onChange({ content: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold text-slate-500">Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            className="w-10 h-10 bg-transparent border-none cursor-pointer"
            value={asset.color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm uppercase font-mono"
            value={asset.color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </div>
      </div>

      {(asset.type === 'shape' || asset.opacity !== undefined) && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-[10px] uppercase font-bold text-slate-500">Opacity</label>
            <span className="text-[9px] text-blue-400 font-mono">{(asset.opacity ?? 0.5).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            className="w-full"
            value={asset.opacity ?? 0.5}
            onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
          />
        </div>
      )}

      {(['position', 'rotation', 'scale'] as const).map(prop => (
        <div key={prop} className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-500">{prop}</label>
          <div className="grid grid-cols-3 gap-2">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-600 font-mono text-center">{axis}</span>
                <input
                  type="number"
                  step="0.1"
                  disabled={prop === 'scale' && asset.type !== 'shape' && asset.type !== 'text'}
                  className={`w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-500 ${(prop === 'scale' && asset.type !== 'shape' && asset.type !== 'text') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={Number(asset[prop][i]).toFixed(2)}
                  onChange={(e) => handleVectorChange(prop, i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-slate-800">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 p-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20 hover:border-red-500/50"
        >
          <Trash2 size={16} />
          <span className="text-sm font-bold">Delete Object</span>
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
