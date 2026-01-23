
import React, { useState, useEffect } from 'react';
import { AppMode, ProjectData } from './types';
import Editor from './components/Editor';
import Viewer from './components/Viewer';

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
      instruction: "Welcome to the 3D Heart Anatomy lesson. Click on the heart to begin exploration.",
      cameraPosition: [5, 5, 5],
      targetAction: 'click',
      targetAssetId: "obj_01"
    }
  ]
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  const [project, setProject] = useState<ProjectData>(DEFAULT_PROJECT);
  const [testMode, setTestMode] = useState<'auto' | 'desktop' | 'mobile' | 'vr'>('auto');
  const [isShared, setIsShared] = useState(false);

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

  useEffect(() => {
    // Check for shared project via URL hash
    const hash = window.location.hash;
    if (hash && hash.startsWith('#project=')) {
      try {
        const base64Data = hash.replace('#project=', '');
        const jsonStr = atob(base64Data);
        const sharedProject = JSON.parse(jsonStr);
        setProject(sharedProject);
        setMode(AppMode.VIEWER); // Enter Viewer mode immediately
        setIsShared(true);
        return;
      } catch (e) {
        console.error("Failed to parse shared project from URL", e);
      }
    }

    // Default to local storage if no hash
    const saved = localStorage.getItem('3d_edtech_project');
    if (saved) {
      try {
        setProject(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load project", e);
      }
    }
  }, []);

  return (
    <div className="w-full h-full bg-slate-900 text-white">
      {mode === AppMode.EDITOR ? (
        <Editor
          project={project}
          onSave={handleSave}
          onSwitchMode={handleSwitchMode}
          testMode={testMode}
          onTestModeChange={setTestMode}
        />
      ) : (
        <Viewer
          project={project}
          onExit={() => {
            if (window.location.hash.startsWith('#project=')) {
              window.location.hash = '';
            }
            setMode(AppMode.EDITOR);
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
