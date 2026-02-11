import { motion, AnimatePresence } from 'framer-motion';
import { Server, Database, Bell, Radio, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SystemArchitecture({ activeEvent }) {
    const [activeNode, setActiveNode] = useState(null);

    useEffect(() => {
        if (activeEvent) {
            // Simulate flow
            const sequence = ['client', 'backend', 'mcp', 'rabbitmq', 'notification'];
            let i = 0;
            const interval = setInterval(() => {
                setActiveNode(sequence[i]);
                i++;
                if (i >= sequence.length) {
                    clearInterval(interval);
                    setTimeout(() => setActiveNode(null), 1000);
                }
            }, 300); // Speed of flow
            return () => clearInterval(interval);
        }
    }, [activeEvent]);

    const nodes = [
        { id: 'client', label: 'Web Client', icon: <Radio />, color: 'text-blue-400' },
        { id: 'backend', label: 'Backend API', icon: <Server />, color: 'text-purple-400' },
        { id: 'mcp', label: 'MCP Server', icon: <Database />, color: 'text-green-400' },
        { id: 'rabbitmq', label: 'RabbitMQ', icon: <ArrowRight />, color: 'text-orange-400' },
        { id: 'notification', label: 'Notify Srv', icon: <Bell />, color: 'text-red-400' },
    ];

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-semibold mb-6 uppercase tracking-wider">System Flow & Architecture</h3>

            <div className="flex justify-between items-center relative">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10" />

                {/* Active Signal Line */}
                {activeNode && (
                    <motion.div
                        layoutId="signal"
                        className="absolute top-1/2 left-0 h-0.5 bg-purple-500 z-0 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5, ease: "linear" }}
                    />
                )}

                {nodes.map((node, index) => (
                    <div key={node.id} className="flex flex-col items-center gap-3 relative z-10 group">
                        <motion.div
                            animate={{
                                scale: activeNode === node.id ? 1.2 : 1,
                                borderColor: activeNode === node.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)',
                                backgroundColor: activeNode === node.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)',
                                boxShadow: activeNode === node.id ? '0 0 20px rgba(168,85,247,0.5)' : 'none'
                            }}
                            className={`p-4 rounded-full border border-white/10 bg-black/50 transition-colors duration-300 ${node.color}`}
                        >
                            {node.icon}
                        </motion.div>
                        <span className={`text-xs font-medium transition-colors ${activeNode === node.id ? 'text-white' : 'text-gray-500'}`}>
                            {node.label}
                        </span>

                        {/* Pulse effect when active */}
                        {activeNode === node.id && (
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-purple-500"
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 2, opacity: 0 }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-6 text-center h-6">
                <AnimatePresence mode='wait'>
                    {activeEvent && (
                        <motion.p
                            key={activeEvent.timestamp}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-purple-300 text-sm font-mono"
                        >
                            Processing: {activeEvent.eventType} → {activeEvent.task.title}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
