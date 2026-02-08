import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface ExportPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (filename: string) => void;
    defaultFilename?: string;
}

const ExportPopup: React.FC<ExportPopupProps> = ({ isOpen, onClose, onConfirm, defaultFilename = '' }) => {
    const [filename, setFilename] = useState(defaultFilename);
    const [error, setError] = useState('');

    const handleConfirm = () => {
        const trimmed = filename.trim();
        if (!trimmed) {
            setError('Please enter a filename');
            return;
        }

        // Remove invalid characters
        const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '_');
        onConfirm(sanitized);

        // Reset state
        setFilename('');
        setError('');
    };

    const handleClose = () => {
        setFilename('');
        setError('');
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            handleClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Download className="text-blue-500" size={24} />
                                    Export Lesson
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Lesson Filename
                                    </label>
                                    <input
                                        type="text"
                                        value={filename}
                                        onChange={(e) => {
                                            setFilename(e.target.value);
                                            setError('');
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="e.g., Anatomy_of_the_Heart"
                                        autoFocus
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-600"
                                    />
                                    {error && (
                                        <p className="text-red-400 text-xs mt-2 px-1">{error}</p>
                                    )}
                                </div>

                                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 mb-1">Export format:</p>
                                    <code className="text-xs text-blue-400 font-mono">
                                        XXXXXX_{filename || 'filename'}.json
                                    </code>
                                    <p className="text-[10px] text-slate-600 mt-2 italic">
                                        * 6-character code will be auto-generated
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Download size={16} />
                                    Export
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ExportPopup;
