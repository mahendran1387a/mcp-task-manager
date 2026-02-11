import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

export default function EventLog({ events }) {
    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 h-[400px] flex flex-col backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <Terminal size={16} className="text-gray-400" />
                <h3 className="text-gray-200 font-mono text-sm">System Event Log</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <AnimatePresence initial={false}>
                    {events.length === 0 && (
                        <p className="text-gray-600 italic px-2">Waiting for events...</p>
                    )}
                    {[...events].reverse().map((event, index) => (
                        <motion.div
                            key={`${event.timestamp}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-2 rounded bg-white/5 border-l-2 border-purple-500 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex justify-between text-gray-500 mb-1">
                                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                <span className="text-purple-400">{event.eventType}</span>
                            </div>
                            <div className="text-gray-300 truncate">
                                {event.task.title}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
