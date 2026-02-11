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
import ToolDiscoveryPanel from './components/ToolDiscoveryPanel';
import QueueWorkbench from './components/QueueWorkbench';

const API_URL = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');

function App() {
  const [tasks, setTasks] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [tools, setTools] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [invokeResult, setInvokeResult] = useState('');
  const [pendingQueue, setPendingQueue] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const addLogEvent = (label, detail) => {
    const event = {
      eventType: label,
      timestamp: Date.now(),
      task: { title: detail }
    };
    setEventHistory((prev) => [...prev, event].slice(-80));
  };

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

  const fetchTools = async () => {
    try {
      setToolsLoading(true);
      const res = await axios.get(`${API_URL}/mcp/tools`);
      setTools(res.data);
      addLogEvent('MCP_DISCOVERY', `Discovered ${res.data.length} tools`);
    } catch (error) {
      addLogEvent('MCP_DISCOVERY_FAILED', error.message);
    } finally {
      setToolsLoading(false);
    }
  };

  const fetchQueuePending = async () => {
    const res = await axios.get(`${API_URL}/queue/pending`);
    setPendingQueue(res.data.pending || []);
  };

  const fetchNotifications = async () => {
    const res = await axios.get(`${API_URL}/notifications`);
    setNotifications(res.data.notifications || []);
  };

  useEffect(() => {
    fetchTasks(filter);
    fetchOverview();
    fetchTools();
    fetchQueuePending();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchOverview();
      fetchQueuePending();
      fetchNotifications();
    }, 7000);

    socket.on('notification_event', (event) => {
      setLatestEvent(event);
      addLogEvent('NOTIFICATION_CONSUMED', `${event.eventType} • ${event.task?.title}`);
      fetchOverview();
      fetchNotifications();
    });

    socket.on('queue_pending_updated', (pending) => {
      setPendingQueue(pending);
    });

    return () => {
      clearInterval(interval);
      socket.off('notification_event');
      socket.off('queue_pending_updated');
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
    addLogEvent('TOOL_CALL', `add_task(${title})`);
    fetchTasks(filter);
    fetchOverview();
  };

  const handleUpdate = async (id, status) => {
    await axios.patch(`${API_URL}/tasks/${id}`, { status });
    addLogEvent('TOOL_CALL', `update_task(id=${id}, status=${status})`);
    fetchTasks(filter);
    fetchOverview();
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_URL}/tasks/${id}`);
    addLogEvent('TOOL_CALL', `delete_task(id=${id})`);
    fetchTasks(filter);
    fetchOverview();
  };

  const handleInvokeTool = async (name, args, parseError) => {
    if (parseError) {
      setInvokeResult(parseError);
      return;
    }

    const res = await axios.post(`${API_URL}/mcp/call`, { name, arguments: args });
    setInvokeResult(res.data.summary || 'Tool call completed.');
    addLogEvent('TOOL_CALL', `${name}(${JSON.stringify(args)})`);
    fetchTasks(filter);
    fetchOverview();
  };

  const handlePullQueue = async (count) => {
    const res = await axios.post(`${API_URL}/queue/pull`, { count });
    setPendingQueue((prev) => {
      const map = new Map(prev.map((item) => [item.deliveryTag, item]));
      (res.data.pulled || []).forEach((item) => map.set(item.deliveryTag, item));
      return Array.from(map.values());
    });
    addLogEvent('QUEUE_PULL', `Pulled ${res.data.pulled?.length || 0} events for review`);
    fetchOverview();
  };

  const handleApproveQueue = async (deliveryTag) => {
    await axios.post(`${API_URL}/queue/${deliveryTag}/approve`);
    addLogEvent('QUEUE_APPROVE', `Approved deliveryTag=${deliveryTag}`);
    fetchQueuePending();
    fetchNotifications();
    fetchOverview();
  };

  const handleRequeue = async (deliveryTag) => {
    await axios.post(`${API_URL}/queue/${deliveryTag}/requeue`);
    addLogEvent('QUEUE_REQUEUE', `Requeued deliveryTag=${deliveryTag}`);
    fetchQueuePending();
    fetchOverview();
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

  const filterPills = useMemo(() => ['all', 'pending', 'in-progress', 'completed'], []);
  const filterPills = useMemo(
    () => ['all', 'pending', 'in-progress', 'completed'],
    []
  );

  return (
    <div className="min-h-screen bg-[#07090f] text-white selection:bg-fuchsia-500/30 font-sans pb-20">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(168,85,247,0.2),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(56,189,248,0.14),transparent_42%)] pointer-events-none" />

      <NotificationToast event={latestEvent} />

      <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-xl shadow-lg shadow-fuchsia-600/20">
              <LayoutGrid size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200">
                MCP Learning Studio
              </h1>
              <p className="text-gray-300 text-sm inline-flex items-center gap-2">
                <Sparkles size={14} className="text-fuchsia-300" />
                Discover tools → invoke calls → review queue → approve notifications → consume updates
                MCP Task Manager Command Center
              </h1>
              <p className="text-gray-300 text-sm inline-flex items-center gap-2">
                <Sparkles size={14} className="text-fuchsia-300" />
                Real-time project visibility, queue health, and event-driven task control
              </p>
            </div>
          </div>
        </header>

        <SystemOverview overview={overview} loading={overviewLoading} />
        <SystemArchitecture activeEvent={latestEvent} />
        <ToolDiscoveryPanel tools={tools} onInvoke={handleInvokeTool} invokeResult={invokeResult} loading={toolsLoading} />
        <QueueWorkbench
          pending={pendingQueue}
          notifications={notifications}
          onPull={handlePullQueue}
          onApprove={handleApproveQueue}
          onRequeue={handleRequeue}
        />

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
