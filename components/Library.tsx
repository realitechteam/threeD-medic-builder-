import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, ArrowLeft, Copy, Check } from 'lucide-react';
import { ProjectData } from '../types';

interface LibraryProps {
    onSelectScene: (project: ProjectData) => void;
    onBack: () => void;
}

interface SceneInfo {
    name: string;
    path: string;
    description: string;
    code?: string;
}

const Library: React.FC<LibraryProps> = ({ onSelectScene, onBack }) => {
    const [loading, setLoading] = React.useState<string | null>(null);
    const [scenes, setScenes] = React.useState<SceneInfo[]>([]);
    const [discovering, setDiscovering] = React.useState(true);
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

    // Dynamically discover all scenes from manifest.json
    React.useEffect(() => {
        const discoverScenes = async () => {
            try {
                const response = await fetch('/defaultScenes/manifest.json');
                if (response.ok) {
                    const manifestScenes = await response.json();
                    console.log('Raw manifest scenes:', manifestScenes);

                    const scenesWithCodes = manifestScenes.map((scene: SceneInfo) => {
                        // Extract filename from path (handle both / and \ just in case, though Mac is /)
                        const fileName = scene.path.split(/[/\\]/).pop() || '';

                        // Expect format: CODE_Name.json
                        const parts = fileName.split('_');
                        const potentialCode = parts[0];

                        // Basic validation: 6 alphanumeric characters
                        const isValidCode = /^[A-Z0-9]{6}$/.test(potentialCode);

                        console.log(`Path: ${scene.path} -> File: ${fileName} -> Code: ${potentialCode} (Valid: ${isValidCode})`);

                        return {
                            ...scene,
                            code: isValidCode ? potentialCode : undefined
                        };
                    });
                    setScenes(scenesWithCodes);
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
                                    <div className="w-full h-48 bg-slate-800 rounded-2xl mb-4 flex items-center justify-center overflow-hidden relative">
                                        <BookOpen className="text-slate-700 group-hover:text-blue-500 transition-colors" size={64} />
                                        {scene.code && (
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">
                                                <span className="text-xs font-mono font-bold text-blue-400 tracking-wider">{scene.code}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scene Info */}
                                    <div className="flex flex-col gap-0.5 mb-2">
                                        {scene.code && (
                                            <div className="flex items-center gap-2">
                                                <div className="text-lg font-bold text-blue-400 leading-tight">
                                                    Code: {scene.code}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(scene.code!);
                                                        setCopiedCode(scene.code || null);
                                                        setTimeout(() => setCopiedCode(null), 2000);
                                                    }}
                                                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
                                                    title="Copy code"
                                                >
                                                    {copiedCode === scene.code ? (
                                                        <Check size={16} />
                                                    ) : (
                                                        <Copy size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        <h3 className="text-lg font-bold text-white leading-tight">
                                            {scene.name}
                                        </h3>
                                    </div>
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
