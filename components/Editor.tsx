
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData, Asset, Step, Vector3Tuple } from '../types';
import Viewport from './Viewport';
import Sidebar from './Sidebar';
import PropertiesPanel from './PropertiesPanel';
import StepManager from './StepManager';
import ExportPopup from './ExportPopup';
import { Save, Play, Download, Trash2, Box, Type, Layers, Eye, EyeOff, CheckCircle, FolderOpen, User, Monitor, Smartphone, Glasses, Globe, Copy, X, Link, CheckCircle2, Home } from 'lucide-react';

interface EditorProps {
  project: ProjectData;
  onSave: (project: ProjectData) => void;
  onSwitchMode: (updatedProject: ProjectData) => void;
  testMode: 'auto' | 'desktop' | 'mobile' | 'vr';
  onTestModeChange: (mode: 'auto' | 'desktop' | 'mobile' | 'vr') => void;
  onBackToHome?: () => void;
}

const Editor: React.FC<EditorProps> = ({ project, onSave, onSwitchMode, testMode, onTestModeChange, onBackToHome }) => {
  const [activeProject, setActiveProject] = useState<ProjectData>(project);

  // Sync state with props when project changes (state update from parent)
  // React.useEffect(() => {
  //   setActiveProject(project);
  //   setLastSaved(null); // Reset save timer on new load
  // }, [project]);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'steps' | 'layers'>('library');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Project Saved Successfully!");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishLink, setPublishLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
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

  const hasPlayerStart = activeProject.assets.some(a => a.type === 'player_start');

  // Ensure default player spawn exists
  React.useEffect(() => {
    if (!hasPlayerStart) {
      addAsset('player_start', undefined, [0, 0, 0]);
    }
  }, []);

  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textSize, setTextSize] = useState(0.3);
  const [pendingTextParams, setPendingTextParams] = useState<{ position: Vector3Tuple } | null>(null);

  const addAsset = (type: Asset['type'], subType?: any, position: Vector3Tuple = [0, 0, 0], url?: string, label?: string) => {
    // UI Feedback check (based on current render state)
    if (type === 'player_start' && activeProject.assets.some(a => a.type === 'player_start')) {
      setShowToast(true);
      setToastMessage("Player Spawn already exists!");
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    if (type === 'text') {
      setPendingTextParams({ position });
      setTextContent('New 3D Label');
      setTextSize(0.3);
      setShowTextModal(true);
      return;
    }

    createAsset(type, position, subType, url, label);
  };

  const createAsset = (type: Asset['type'], position: Vector3Tuple, subType?: any, url?: string, label?: string, content?: string, scaleVal: number = 1) => {
    // Check if we are updating the room environment (Singleton pattern for Room)
    if (subType === 'room') {
      let existingRoom = activeProject.assets.find(a => a.geometryType === 'room');

      // Fallback: Check if there's a default "Environment" asset (legacy data)
      if (!existingRoom) {
        existingRoom = activeProject.assets.find(a => a.name === 'Environment' && a.type === 'model');
      }

      if (existingRoom) {
        updateAsset(existingRoom.id, {
          url,
          name: label || existingRoom.name,
          geometryType: 'room' // Ensure it's tagged correctly now
        });
        setSelectedAssetId(existingRoom.id);
        return;
      }
    }

    const newAssetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    setActiveProject(prev => {
      // Robust check against race conditions
      if (type === 'player_start' && prev.assets.some(a => a.type === 'player_start')) {
        return prev;
      }

      const newAsset: Asset = {
        id: newAssetId,
        name: label || (subType === 'custom' ? 'Custom Model' : `New ${subType || type}`),
        type,
        geometryType: subType,
        color: type === 'shape' ? "#3b82f6" : "#ffffff",
        position,
        rotation: [0, 0, 0],
        scale: [scaleVal, scaleVal, scaleVal],
        content: content,
        url: url,
        visible: true,
        opacity: type === 'shape' ? 0.5 : 1
      };

      return { ...prev, assets: [...prev.assets, newAsset] };
    });

    // Automatically select the new asset
    // We delay slightly to ensure the asset exists in the scene before selection highlights occur, though standard React batching usually handles this fine.
    // However, if we don't want to select player_start repeatedly if it failed, we should check type. But `player_start` check is inside setActiveProject.
    // For now, we'll optimistically select it. If it wasn't added due to the check, it might just select nothing or fail gracefully if we tried to find it. 
    // Actually, simply setting the ID is safe.
    if (type !== 'player_start' || !hasPlayerStart) {
      setSelectedAssetId(newAssetId);
    }
  };

  const handleConfirmText = () => {
    if (pendingTextParams) {
      createAsset('text', pendingTextParams.position, undefined, undefined, '3D Label', textContent, textSize);
      setShowTextModal(false);
      setPendingTextParams(null);
    }
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

  // Generate 6-character UUID (alphanumeric uppercase)
  const generateUUID6 = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleExport = () => {
    setShowExportPopup(true);
  };

  const confirmExport = (filename: string) => {
    const uuid = generateUUID6();
    const fullFilename = `${uuid}_${filename}.json`;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeProject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fullFilename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    setShowExportPopup(false);
    setToastMessage(`Exported: ${fullFilename}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handlePublish = () => {
    try {
      const jsonStr = JSON.stringify(activeProject);
      const base64Data = btoa(jsonStr);
      const fullUrl = `${window.location.origin}${window.location.pathname}#project=${base64Data}`;
      setPublishLink(fullUrl);
      setShowPublishModal(true);
    } catch (e) {
      alert("Failed to create shareable link. The project might be too large.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publishLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <Sidebar onAddAsset={addAsset} hasPlayerStart={hasPlayerStart} />
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
          onDropAsset={(type, subType, pos, url, label) => addAsset(type as any, subType, pos, url, label)}
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

        <AnimatePresence>
          {showTextModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowTextModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setShowTextModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-blue-400 mb-2">
                    <Type size={24} />
                    <h2 className="text-xl font-bold text-white">Add 3D Label</h2>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Label Text</label>
                    <input
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Enter text..."
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmText()}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">Size</label>
                      <span className="text-xs text-blue-400 font-mono">{textSize.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      className="w-full"
                      value={textSize}
                      onChange={(e) => setTextSize(parseFloat(e.target.value))}
                    />
                  </div>

                  <button
                    onClick={handleConfirmText}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Add Label
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPublishModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowPublishModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                  <button onClick={() => setShowPublishModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-6">
                    <Globe size={40} />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Lesson Published!</h2>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">Anyone with this link can experience your 3D lesson directly in their browser.</p>
                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 mb-8 group">
                    <Link size={18} className="text-slate-600 shrink-0" />
                    <input readOnly value={publishLink} className="bg-transparent text-xs text-blue-300 font-mono w-full focus:outline-none select-all overflow-hidden text-ellipsis whitespace-nowrap" />
                  </div>
                  <div className="flex gap-4 w-full">
                    <button onClick={copyToClipboard} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                      {copied ? <><CheckCircle2 size={20} /> Copied!</> : <><Copy size={20} /> Copy Link</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ExportPopup
          isOpen={showExportPopup}
          onClose={() => setShowExportPopup(false)}
          onConfirm={confirmExport}
          defaultFilename={activeProject.projectName.replace(/\s+/g, '_')}
        />

        <div className="absolute top-4 left-4 flex gap-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95 border border-slate-700"
            >
              <Home size={18} /> Home
            </button>
          )}
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

          <button onClick={handlePublish} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-transform active:scale-95 border-l border-indigo-500"><Globe size={18} /> Publish</button>

          {/* Test Mode Selector */}
          <div className="relative">
            <select
              value={testMode}
              onChange={(e) => onTestModeChange(e.target.value as any)}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm font-medium shadow-lg cursor-pointer appearance-none pr-8 transition-colors"
              title="Select preview mode for testing"
            >
              <option value="auto">🔄 Auto Detect</option>
              <option value="desktop">🖥️ Desktop</option>
              <option value="mobile">📱 Mobile</option>
              <option value="vr">🥽 VR</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

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
            onDelete={() => deleteAsset(selectedAsset.id)}
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
