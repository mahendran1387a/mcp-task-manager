import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import TaskCard from './components/TaskCard';
import AddTask from './components/AddTask';
import NotificationToast from './components/NotificationToast';
import SystemArchitecture from './components/SystemArchitecture';
import EventLog from './components/EventLog';

const API_URL = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');

function App() {
  const [tasks, setTasks] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [filter, setFilter] = useState('all');

  // Fetch tasks
  const fetchTasks = async (status = 'all') => {
    try {
      const res = await axios.get(`${API_URL}/tasks?status=${status}`);
      if (Array.isArray(res.data)) {
        setTasks(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();

    socket.on('task_event', (event) => {
      console.log('Real-time update:', event);
      setLatestEvent(event);
      // Keep last 50 events
      setEventHistory(prev => [...prev, event].slice(-50));
      fetchTasks(filter);
    });

    return () => socket.off('task_event');
  }, [filter]);

  const handleAdd = async ({ title, description }) => {
    await axios.post(`${API_URL}/tasks`, { title, description });
  };

  const handleUpdate = async (id, status) => {
    await axios.patch(`${API_URL}/tasks/${id}`, { status });
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_URL}/tasks/${id}`);
  };

  // Simulate a notification for demonstration
  const simulateNotification = () => {
    const fakeEvent = {
      eventType: 'TEST_NOTIFICATION',
      timestamp: Date.now(),
      task: { title: 'Test System Flow' }
    };
    setLatestEvent(fakeEvent);
    setEventHistory(prev => [...prev, fakeEvent].slice(-50));
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 font-sans pb-20">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none" />

      <NotificationToast event={latestEvent} />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-xl shadow-lg shadow-purple-600/20">
              <LayoutGrid size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                MCP Task Manager
              </h1>
              <p className="text-gray-400 text-sm">Real-time • Event Driven</p>
            </div>
          </div>

          <button
            onClick={simulateNotification}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
          >
            Simulate Flow
          </button>
        </header>

        {/* Visual Flow Section */}
        <SystemArchitecture activeEvent={latestEvent} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Task Area */}
          <div className="lg:col-span-3">
            <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10 mb-6 w-fit">
              {['all', 'pending', 'in-progress', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === f
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <AnimatePresence mode='popLayout'>
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500"
                  >
                    <div className="bg-white/5 p-4 rounded-full mb-4">
                      <LayoutGrid size={48} className="opacity-20" />
                    </div>
                    <p>No tasks found in this view.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sidebar Event Log */}
          <div className="lg:col-span-1">
            <EventLog events={eventHistory} />
          </div>
        </div>

        <AddTask onAdd={handleAdd} />
      </div>
    </div>
  );
}

export default App;
