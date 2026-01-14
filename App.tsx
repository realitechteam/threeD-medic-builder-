
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
          onExit={() => setMode(AppMode.EDITOR)}
          testMode={testMode}
        />
      )}
    </div>
  );
};

export default App;
