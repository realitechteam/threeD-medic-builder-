
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData, Asset, Step, Vector3Tuple } from '../types';
import Viewport from './Viewport';
import Sidebar from './Sidebar';
import PropertiesPanel from './PropertiesPanel';
import StepManager from './StepManager';
import { Save, Play, Download, Trash2, Box, Type, Layers, Eye, EyeOff, CheckCircle, FolderOpen, User } from 'lucide-react';

interface EditorProps {
  project: ProjectData;
  onSave: (project: ProjectData) => void;
  onSwitchMode: (updatedProject: ProjectData) => void;
}

const Editor: React.FC<EditorProps> = ({ project, onSave, onSwitchMode }) => {
  const [activeProject, setActiveProject] = useState<ProjectData>(project);

  // Sync state with props when project changes (state update from parent)
  React.useEffect(() => {
    setActiveProject(project);
    setLastSaved(null); // Reset save timer on new load
  }, [project]);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'steps' | 'layers'>('library');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Project Saved Successfully!");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ProjectData;

        // Basic validation or migration could go here
        if (data && data.assets) {
          setActiveProject(data);
          setToastMessage("Project Loaded Successfully!");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        } else {
          console.error("Invalid project file format");
        }
      } catch (error) {
        console.error("Error parsing project file:", error);
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be selected again
    event.target.value = '';
  };

  const handleSave = async () => {
    if (saveStatus !== 'idle') return;

    setSaveStatus('saving');

    // Simulate network/processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 600));

    // Save to LocalStorage
    try {
      localStorage.setItem('3d_edtech_project', JSON.stringify(activeProject));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }

    // Call parent handler
    onSave(activeProject);

    const now = new Date();
    setLastSaved(now);
    setSaveStatus('saved');
    setToastMessage("Project Saved Successfully!");
    setShowToast(true);

    // Reset status and hide toast after delay
    setTimeout(() => {
      setSaveStatus('idle');
      setShowToast(false);
    }, 2000);
  };

  const updateAsset = useCallback((assetId: string, updates: Partial<Asset>) => {
    setActiveProject(prev => ({
      ...prev,
      assets: prev.assets.map(a => a.id === assetId ? { ...a, ...updates } : a)
    }));
  }, []);

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
      <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-900 shadow-xl z-10">
        <div className="p-4 border-b border-slate-800 flex flex-col gap-1">
          <input
            className="bg-transparent font-bold text-lg focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 w-full"
            value={activeProject.projectName}
            onChange={(e) => setActiveProject({ ...activeProject, projectName: e.target.value })}
          />
          {lastSaved && (
            <span className="text-xs text-slate-500 ml-1">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
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
                    {asset.type === 'shape' ? <Box size={16} /> : asset.type === 'text' ? <Type size={16} /> : asset.type === 'player_start' ? <User size={16} /> : <Layers size={16} />}
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
          onDropAsset={(type, subType, pos, url) => addAsset(type as any, subType, pos, url)}
        />

        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute top-8 left-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50"
            >
              <CheckCircle size={20} className="text-white" />
              <span className="font-bold">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-4 left-4 flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={handleOpen}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95"
          >
            <FolderOpen size={18} /> Open
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus !== 'idle'}
            className={`${saveStatus === 'saved' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-all active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed min-w-[100px] justify-center`}
          >
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle size={18} /> Saved
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="animate-pulse">Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} /> Save
              </>
            )}
          </button>
          <button
            onClick={() => onSwitchMode(activeProject)}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95"
          >
            <Play size={18} /> Preview
          </button>
          <button
            onClick={handleExport}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95"
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
