
import React, { useState, useEffect } from 'react';
import { AppMode, ProjectData } from './types';
import Editor from './components/Editor';
import Viewer from './components/Viewer';
import Library from './components/Library';
import { Box, Plus, BookOpen, Key, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const DEFAULT_PROJECT: ProjectData = {
  projectName: "Anatomy of the Heart",
  assets: [
    {
      id: "default_env_01",
      name: "Environment",
      type: "model",
      url: "/models/rooms/mainHospital.glb",
      color: "#ffffff",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      locked: true
    },

  ],
  steps: [
    {
      id: "step_01",
      title: "Introduction",
      instruction: "Welcome to the 3D Heart Anatomy lesson.\\nAre you ready to start?",
      cameraPosition: [5, 5, 5],
      targetAction: 'click',
      targetAssetId: "obj_01"
    }
  ]
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode | 'HOME' | 'LIBRARY'>('HOME');
  const [project, setProject] = useState<ProjectData>(DEFAULT_PROJECT);
  const [testMode, setTestMode] = useState<'auto' | 'desktop' | 'mobile' | 'vr'>('auto');
  const [isShared, setIsShared] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = (newProject: ProjectData) => {
    setProject(newProject);
    localStorage.setItem('3d_edtech_project', JSON.stringify(newProject));
  };

  const handleSwitchMode = (updatedProject?: ProjectData) => {
    if (updatedProject) {
      setProject(updatedProject);
    }
    setMode(prev => prev === AppMode.EDITOR ? AppMode.VIEWER : AppMode.EDITOR);
  };

  const loadFromCode = async (code: string) => {
    try {
      const trimmedCode = code.trim().toUpperCase();

      // Check if it's a 6-character lesson code (file prefix)
      if (trimmedCode.length !== 6) {
        setError("Please enter a valid 6-character lesson code.");
        return;
      }

      // Fetch manifest to find matching scene
      const response = await fetch('/defaultScenes/manifest.json');
      if (response.ok) {
        const scenes = await response.json();

        // Find scene where path contains the 6-character code as prefix
        const matchedScene = scenes.find((scene: any) => {
          const filename = scene.path.split('/').pop(); // Get filename from path
          return filename?.toUpperCase().startsWith(trimmedCode);
        });

        if (matchedScene) {
          // Load the matched scene file
          const sceneResponse = await fetch(matchedScene.path);
          if (sceneResponse.ok) {
            const sceneData = await sceneResponse.json();
            setProject(sceneData);
            setMode(AppMode.VIEWER);
            setIsShared(true);
            setError(null);
            return;
          }
        }

        // No match found
        setError("Lesson code not found. Please check again.");
      }
    } catch (e) {
      setError("Invalid Lesson Code. Please check again.");
    }
  };

  useEffect(() => {
    // Check for shared project via URL hash
    const hash = window.location.hash;
    if (hash && hash.startsWith('#project=')) {
      try {
        const base64Data = hash.replace('#project=', '');
        loadFromCode(base64Data);
        return;
      } catch (e) {
        console.error("Failed to parse shared project from URL", e);
      }
    }

    // No auto-load - stay on HOME page
    console.log('ℹ️ Showing HOME landing page');
  }, []);

  // HOME Landing Page
  if (mode === 'HOME') {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center p-6 font-['Inter']">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10"
        >
          {/* Left: Branding */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Box className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-white">3D-Medic <span className="text-blue-500">BUILDER</span></h1>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed">
              Create immersive 3D medical lessons in minutes. Share them with ease. No coding required.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-slate-500 text-sm font-medium">Join educators worldwide</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="space-y-4">
            {/* Join Lesson */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Key className="text-blue-500" size={20} /> Join a Lesson</h2>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter Lesson Code..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFromCode(inputCode)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none pr-12 font-mono uppercase tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  />
                  <button
                    onClick={() => loadFromCode(inputCode)}
                    className="absolute right-2 top-2 bottom-2 w-10 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center text-white transition-colors"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                {error && <p className="text-red-400 text-[10px] font-bold px-2">{error}</p>}
                <p className="text-slate-500 text-[10px] px-2 italic">Tip: Paste the long link or just the code part.</p>
              </div>
            </div>

            {/* Create Project */}
            <div className="grid grid-cols-2 gap-4">
              {/* New Lesson / Editor */}
              <button
                onClick={() => setMode(AppMode.EDITOR)}
                className="bg-white hover:bg-slate-100 text-slate-950 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="font-bold text-sm">Editor</span>
              </button>

              {/* Library */}
              <button
                onClick={() => setMode('LIBRARY')}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <span className="font-bold text-sm">Library</span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
          Powered by Gemini AI & Three.js
        </div>
      </div>
    );
  }

  // LIBRARY Mode
  if (mode === 'LIBRARY') {
    return (
      <Library
        onSelectScene={(sceneProject) => {
          setProject(sceneProject);
          setMode(AppMode.EDITOR);
        }}
        onBack={() => setMode('HOME')}
      />
    );
  }

  // EDITOR or VIEWER Mode
  return (
    <div className="w-full h-full bg-slate-900 text-white">
      {mode === AppMode.EDITOR ? (
        <Editor
          project={project}
          onSave={handleSave}
          onSwitchMode={handleSwitchMode}
          testMode={testMode}
          onTestModeChange={setTestMode}
          onBackToHome={() => setMode('HOME')}
        />
      ) : (
        <Viewer
          project={project}
          onExit={() => {
            if (window.location.hash.startsWith('#project=')) {
              window.location.hash = '';
            }
            setMode('HOME');
            setIsShared(false);
          }}
          testMode={testMode}
          isShared={isShared}
        />
      )}
    </div>
  );
};

export default App;
