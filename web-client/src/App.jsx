import { useState, useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Sparkles } from 'lucide-react';
import TaskCard from './components/TaskCard';
import AddTask from './components/AddTask';
import NotificationToast from './components/NotificationToast';
import SystemArchitecture from './components/SystemArchitecture';
import EventLog from './components/EventLog';
import SystemOverview from './components/SystemOverview';

const API_URL = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');

function App() {
  const [tasks, setTasks] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

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

  const fetchOverview = async () => {
    try {
      setOverviewLoading(true);
      const res = await axios.get(`${API_URL}/overview`);
      setOverview(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(filter);
    fetchOverview();

    const interval = setInterval(fetchOverview, 8000);

    socket.on('task_event', (event) => {
      setLatestEvent(event);
      setEventHistory((prev) => [...prev, event].slice(-50));
      fetchTasks(filter);
      fetchOverview();
    });

    return () => {
      clearInterval(interval);
      socket.off('task_event');
    };
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

  const simulateNotification = () => {
    const fakeEvent = {
      eventType: 'TEST_NOTIFICATION',
      timestamp: Date.now(),
      task: { title: 'Test System Flow' }
    };
    setLatestEvent(fakeEvent);
    setEventHistory((prev) => [...prev, fakeEvent].slice(-50));
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((task) => task.status === filter);

  const filterPills = useMemo(
    () => ['all', 'pending', 'in-progress', 'completed'],
    []
  );

  return (
    <div className="min-h-screen bg-[#07090f] text-white selection:bg-fuchsia-500/30 font-sans pb-20">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(168,85,247,0.2),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(56,189,248,0.14),transparent_42%)] pointer-events-none" />

      <NotificationToast event={latestEvent} />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-xl shadow-lg shadow-fuchsia-600/20">
              <LayoutGrid size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200">
                MCP Task Manager Command Center
              </h1>
              <p className="text-gray-300 text-sm inline-flex items-center gap-2">
                <Sparkles size={14} className="text-fuchsia-300" />
                Real-time project visibility, queue health, and event-driven task control
              </p>
            </div>
          </div>

          <button
            onClick={simulateNotification}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
          >
            Simulate Flow
          </button>
        </header>

        <SystemOverview overview={overview} loading={overviewLoading} />
        <SystemArchitecture activeEvent={latestEvent} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10 mb-6 w-fit shadow-inner shadow-white/5">
              {filterPills.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
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
