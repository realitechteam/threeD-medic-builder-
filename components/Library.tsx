import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, ArrowLeft } from 'lucide-react';
import { ProjectData } from '../types';

interface LibraryProps {
    onSelectScene: (project: ProjectData) => void;
    onBack: () => void;
}

interface SceneInfo {
    name: string;
    path: string;
    description: string;
}

const Library: React.FC<LibraryProps> = ({ onSelectScene, onBack }) => {
    const [loading, setLoading] = React.useState<string | null>(null);
    const [scenes, setScenes] = React.useState<SceneInfo[]>([]);
    const [discovering, setDiscovering] = React.useState(true);

    // Dynamically discover all scenes from manifest.json
    React.useEffect(() => {
        const discoverScenes = async () => {
            try {
                const response = await fetch('/defaultScenes/manifest.json');
                if (response.ok) {
                    const manifestScenes = await response.json();
                    setScenes(manifestScenes);
                }
            } catch (e) {
                console.error('Failed to load scene manifest', e);
            } finally {
                setDiscovering(false);
            }
        };

        discoverScenes();
    }, []);

    const loadScene = async (scenePath: string) => {
        setLoading(scenePath);
        try {
            const response = await fetch(scenePath);
            if (response.ok) {
                const sceneData = await response.json();
                onSelectScene(sceneData);
            } else {
                alert('Failed to load scene');
            }
        } catch (e) {
            console.error('Failed to load scene:', e);
            alert('Error loading scene');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="w-full h-full bg-slate-950 flex flex-col font-['Inter']">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-slate-800">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <BookOpen className="text-blue-500" size={24} />
                                Scene Library
                            </h1>
                            <p className="text-slate-500 text-sm">Browse and load interactive 3D lessons</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scene Grid */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto">
                    {discovering ? (
                        <div className="text-center py-20">
                            <BookOpen className="mx-auto text-slate-700 mb-4 animate-pulse" size={64} />
                            <p className="text-slate-500 text-lg">Discovering scenes...</p>
                        </div>
                    ) : scenes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scenes.map((scene) => (
                                <motion.div
                                    key={scene.path}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all group"
                                >
                                    {/* Thumbnail Placeholder */}
                                    <div className="w-full h-48 bg-slate-800 rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
                                        <BookOpen className="text-slate-700 group-hover:text-blue-500 transition-colors" size={64} />
                                    </div>

                                    {/* Scene Info */}
                                    <h3 className="text-lg font-bold text-white mb-2">{scene.name}</h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{scene.description}</p>

                                    {/* Load Button */}
                                    <button
                                        onClick={() => loadScene(scene.path)}
                                        disabled={loading === scene.path}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed"
                                    >
                                        {loading === scene.path ? (
                                            <>Loading...</>
                                        ) : (
                                            <>
                                                <Play size={16} />
                                                Start Lesson
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <BookOpen className="mx-auto text-slate-700 mb-4" size={64} />
                            <p className="text-slate-500 text-lg">No scenes available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Library;
