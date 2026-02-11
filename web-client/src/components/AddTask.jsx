import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddTask({ onAdd }) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({ title, description });
        setTitle('');
        setDescription('');
        setIsOpen(false);
    };

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-full shadow-2xl z-50 flex items-center justify-center"
            >
                <Plus size={32} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">New Task</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                        placeholder="What needs to be done?"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 transition-colors h-24 resize-none"
                                        placeholder="Add details..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium shadow-lg shadow-purple-900/20 transition-all transform active:scale-95"
                                    >
                                        Create Task
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
