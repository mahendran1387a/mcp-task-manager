import { motion } from 'framer-motion';
import { Trash2, CheckCircle, Circle, Clock } from 'lucide-react';

export default function TaskCard({ task, onUpdate, onDelete }) {
    const statusColors = {
        pending: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200',
        'in-progress': 'bg-blue-500/20 border-blue-500/50 text-blue-200',
        completed: 'bg-green-500/20 border-green-500/50 text-green-200',
    };

    const statusIcons = {
        pending: <Circle size={16} />,
        'in-progress': <Clock size={16} />,
        completed: <CheckCircle size={16} />,
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg hover:bg-white/15 transition-all text-white"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{task.title}</h3>
                <button
                    onClick={() => onDelete(task.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-500/20"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {task.description && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{task.description}</p>
            )}

            <div className="flex justify-between items-center mt-2">
                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
                    {statusIcons[task.status]}
                    {task.status.toUpperCase()}
                </span>

                <select
                    value={task.status}
                    onChange={(e) => onUpdate(task.id, e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-sm text-gray-200 outline-none focus:border-purple-500 transition-colors"
                >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
        </motion.div>
    );
}
