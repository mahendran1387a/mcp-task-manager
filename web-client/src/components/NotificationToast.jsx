import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Bell, Check, Trash } from 'lucide-react';

export default function NotificationToast({ event }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (event) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [event]);

    if (!event) return null;

    const icons = {
        TASK_CREATED: <Bell className="text-purple-400" />,
        TASK_UPDATED: <Check className="text-green-400" />,
        TASK_DELETED: <Trash className="text-red-400" />,
    };

    const titles = {
        TASK_CREATED: 'New Task',
        TASK_UPDATED: 'Task Updated',
        TASK_DELETED: 'Task Deleted',
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="fixed top-8 right-8 z-50 pointer-events-none"
                >
                    <div className="bg-[#1e1e1e]/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className="p-2 bg-white/5 rounded-full">
                            {icons[event.eventType] || <Bell className="text-blue-400" />}
                        </div>
                        <div>
                            <h4 className="font-semibold text-white">{titles[event.eventType]}</h4>
                            <p className="text-sm text-gray-300">{event.task.title}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
