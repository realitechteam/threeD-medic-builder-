
import React from 'react';
import { Plus, Trash2, MousePointer2, Move, Anchor } from 'lucide-react';
import { Step, Asset, Vector3Tuple } from '../types';

interface StepManagerProps {
  steps: Step[];
  assets: Asset[];
  onUpdateSteps: (steps: Step[]) => void;
  selectedAssetId: string | null;
}

const StepManager: React.FC<StepManagerProps> = ({ steps, assets, onUpdateSteps, selectedAssetId }) => {
  const addStep = () => {
    const newStep: Step = {
      id: `step_${Date.now()}`,
      title: `Step ${steps.length}`,
      instruction: "Explain what the student should do here...",
      cameraPosition: [5, 5, 5],
      targetAction: 'none'
    };
    onUpdateSteps([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<Step>) => {
    onUpdateSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStep = (id: string) => {
    onUpdateSteps(steps.filter(s => s.id !== id));
  };



  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
              {index === 0 ? 'INTRODUCTION' : `STEP ${index}`}
            </span>
            <button onClick={() => deleteStep(step.id)} className="text-slate-500 hover:text-red-400 p-1">
              <Trash2 size={14} />
            </button>
          </div>

          <input
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-medium focus:ring-1 focus:ring-blue-500"
            value={step.title}
            placeholder="Step Title"
            onChange={(e) => updateStep(step.id, { title: e.target.value })}
          />

          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 h-20 resize-none leading-relaxed"
            value={step.instruction}
            placeholder="Instruction for students..."
            onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
          />

          {index !== 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-700/50">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <MousePointer2 size={10} /> Movable Object
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-blue-500"
                  value={step.targetAssetId || ''}
                  onChange={(e) => updateStep(step.id, {
                    targetAssetId: e.target.value,
                    targetAction: e.target.value ? (step.targetAction === 'none' ? 'click' : step.targetAction) : 'none'
                  })}
                >
                  <option value="">No object selected</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {step.targetAssetId && (
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-500">Interaction Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStep(step.id, { targetAction: 'click' })}
                      className={`flex-1 py-1 text-[10px] rounded font-bold transition-colors ${step.targetAction === 'click' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                    >
                      CLICK
                    </button>
                    <button
                      onClick={() => updateStep(step.id, { targetAction: 'move' })}
                      className={`flex-1 py-1 text-[10px] rounded font-bold transition-colors ${step.targetAction === 'move' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                    >
                      MOVE
                    </button>
                  </div>
                </div>
              )}

              {step.targetAction === 'move' && (
                <div className="bg-slate-900/50 p-2 rounded border border-slate-700 space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                      <Anchor size={10} /> SNAP TO TARGET
                    </label>
                    <select
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-blue-500 text-blue-100"
                      value={step.snapAnchorId || ''}
                      onChange={(e) => {
                        const anchorId = e.target.value;
                        const anchorAsset = assets.find(a => a.id === anchorId);
                        updateStep(step.id, {
                          snapAnchorId: anchorId,
                          targetPosition: anchorAsset ? [...anchorAsset.position] as Vector3Tuple : undefined
                        });
                      }}
                    >
                      <option value="">Select Destination Object...</option>
                      {assets.filter(a => a.id !== step.targetAssetId).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[8px] text-slate-500 italic leading-tight">
                    Student will drag the object. It will automatically snap when close to the target.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addStep}
        className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-400 flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
      >
        <Plus size={24} />
        <span className="text-xs font-bold uppercase tracking-widest">Add Next Step</span>
      </button>
    </div >
  );
};

export default StepManager;
