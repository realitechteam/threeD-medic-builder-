
import React, { useState, useCallback, useRef } from 'react';
import { ProjectData, Asset, Step, Vector3Tuple } from '../types';
import Viewport from './Viewport';
import Sidebar from './Sidebar';
import PropertiesPanel from './PropertiesPanel';
import StepManager from './StepManager';
import { Save, Play, Download, Trash2, Box, Type, Layers, Eye, EyeOff, CheckCircle2, Clock, FolderOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorProps {
  project: ProjectData;
  onSave: (project: ProjectData) => void;
  onSwitchMode: (updatedProject: ProjectData) => void;
}

const Editor: React.FC<EditorProps> = ({ project, onSave, onSwitchMode }) => {
  const [activeProject, setActiveProject] = useState<ProjectData>(project);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'steps' | 'layers'>('library');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'loaded' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const updateAsset = useCallback((assetId: string, updates: Partial<Asset>) => {
    setActiveProject(prev => ({
      ...prev,
      assets: prev.assets.map(a => a.id === assetId ? { ...a, ...updates } : a)
    }));
  }, []);

  const handleLocalSave = () => {
    setSaveStatus('saving');
    onSave(activeProject);
    
    setTimeout(() => {
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation: check if it looks like ProjectData
        if (json.projectName && Array.isArray(json.assets) && Array.isArray(json.steps)) {
          setActiveProject(json);
          setSelectedAssetId(null);
          setSaveStatus('loaded');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          throw new Error("Invalid project format");
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
      if (projectFileInputRef.current) projectFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const addAsset = (type: Asset['type'], subType?: any, position: Vector3Tuple = [0, 0, 0], url?: string) => {
    const newAsset: Asset = {
      id: `asset_${Date.now()}`,
      name: subType === 'custom' ? 'Custom Model' : `New ${subType || type}`,
      type,
      geometryType: subType,
      color: type === 'shape' ? "#3b82f6" : "#ffffff",
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      content: type === 'text' ? 'New Text' : undefined,
      url: url,
      visible: true
    };
    setActiveProject(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
  };

  const deleteAsset = (id: string) => {
    setActiveProject(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
    if (selectedAssetId === id) setSelectedAssetId(null);
  };

  const toggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const asset = activeProject.assets.find(a => a.id === id);
    if (asset) {
      updateAsset(id, { visible: asset.visible === false ? true : false });
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeProject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${activeProject.projectName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const selectedAsset = activeProject.assets.find(a => a.id === selectedAssetId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950">
      {/* Notifications */}
      <AnimatePresence>
        {(saveStatus === 'saved' || saveStatus === 'loaded') && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 size={20} />
            {saveStatus === 'saved' ? 'Project saved to browser storage!' : 'Project loaded successfully!'}
          </motion.div>
        )}
        {saveStatus === 'error' && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold"
          >
            <AlertCircle size={20} />
            Failed to load project file. Invalid format.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-900 shadow-xl z-10">
        <div className="p-4 border-b border-slate-800 flex flex-col gap-2">
          <input 
            className="bg-transparent font-bold text-lg focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 w-full"
            value={activeProject.projectName}
            onChange={(e) => setActiveProject({ ...activeProject, projectName: e.target.value })}
          />
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <Clock size={10} /> Last saved: {lastSaved}
            </div>
          )}
        </div>
        
        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${activeTab === 'library' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Library
          </button>
          <button 
            onClick={() => setActiveTab('steps')}
            className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${activeTab === 'steps' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Steps
          </button>
          <button 
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${activeTab === 'layers' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Layers
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'library' && (
            <Sidebar onAddAsset={addAsset} />
          )}
          {activeTab === 'steps' && (
            <StepManager 
              steps={activeProject.steps} 
              assets={activeProject.assets}
              onUpdateSteps={(steps) => setActiveProject({ ...activeProject, steps })} 
              selectedAssetId={selectedAssetId}
            />
          )}
          {activeTab === 'layers' && (
            <div className="space-y-2">
              {activeProject.assets.map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${selectedAssetId === asset.id ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-slate-800 hover:bg-slate-700'} ${asset.visible === false ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {asset.type === 'shape' ? <Box size={16} /> : asset.type === 'text' ? <Type size={16} /> : <Layers size={16} />}
                    <span className="text-sm font-medium truncate max-w-[120px]">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => toggleVisibility(e, asset.id)}
                      className={`p-1.5 rounded hover:bg-slate-600 transition-colors ${asset.visible === false ? 'text-slate-500' : 'text-blue-400'}`}
                    >
                      {asset.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-slate-900">
        <Viewport 
          assets={activeProject.assets} 
          selectedAssetId={selectedAssetId} 
          onAssetUpdate={updateAsset}
          onSelectAsset={setSelectedAssetId}
          onDropAsset={(type, subType, pos) => addAsset(type as any, subType, pos)}
        />
        
        <div className="absolute top-4 left-4 flex gap-2">
          <input 
            type="file" 
            ref={projectFileInputRef} 
            className="hidden" 
            accept=".json" 
            onChange={handleImportProject}
          />
          <button 
            onClick={() => projectFileInputRef.current?.click()}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95"
          >
            <FolderOpen size={18} /> Open
          </button>
          <button 
            onClick={handleLocalSave}
            disabled={saveStatus !== 'idle'}
            className={`${
              saveStatus === 'saved' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'
            } px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-all active:scale-95 disabled:opacity-80 min-w-[100px] justify-center`}
          >
            {saveStatus === 'idle' && <><Save size={18} /> Save</>}
            {saveStatus === 'saving' && <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Clock size={18} /></motion.div> Saving...</>}
            {saveStatus === 'saved' && <><CheckCircle2 size={18} /> Saved</>}
          </button>
          <button 
            onClick={() => onSwitchMode(activeProject)}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95"
          >
            <Play size={18} /> Preview
          </button>
          <button 
            onClick={handleExport}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95 ml-4 border-l border-slate-600 pl-6"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div className="w-80 border-l border-slate-800 bg-slate-900 shadow-xl overflow-y-auto">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Properties</h3>
        </div>
        {selectedAsset ? (
          <PropertiesPanel 
            asset={selectedAsset} 
            onChange={(updates) => updateAsset(selectedAsset.id, updates)} 
          />
        ) : (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-4">
            <Layers size={48} className="opacity-20" />
            <p className="text-sm">Select an object in the scene or layers to edit its properties.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
