import { Activity, CheckCircle2, Clock3, Layers, ServerCrash, WifiOff } from 'lucide-react';

const statusStyles = {
    online: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
    degraded: 'text-amber-200 bg-amber-500/10 border-amber-300/30',
    connecting: 'text-sky-200 bg-sky-500/10 border-sky-300/30',
    offline: 'text-rose-200 bg-rose-500/10 border-rose-300/30',
    unknown: 'text-gray-200 bg-gray-500/10 border-gray-300/30'
};

const statusIcon = {
    online: <CheckCircle2 size={14} />,
    degraded: <ServerCrash size={14} />,
    connecting: <Activity size={14} className="animate-pulse" />,
    offline: <WifiOff size={14} />,
    unknown: <Clock3 size={14} />
};

function StatusPill({ status }) {
    const value = status || 'unknown';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${statusStyles[value] || statusStyles.unknown}`}>
            {statusIcon[value] || statusIcon.unknown}
            {value}
        </span>
    );
}

function MetricCard({ label, value, tone = 'default' }) {
    const toneClasses = {
        default: 'text-white border-white/10 bg-white/5',
        pending: 'text-amber-200 border-amber-400/20 bg-amber-500/10',
        progress: 'text-sky-200 border-sky-400/20 bg-sky-500/10',
        completed: 'text-emerald-200 border-emerald-400/20 bg-emerald-500/10'
    };

    return (
        <div className={`rounded-xl border p-4 ${toneClasses[tone] || toneClasses.default}`}>
            <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
    );
}

export default function SystemOverview({ overview, loading }) {
    const services = overview?.services || {};
    const taskStats = overview?.tasks || { total: 0, pending: 0, inProgress: 0, completed: 0 };

    return (
        <section className="mb-8 grid grid-cols-1 xl:grid-cols-5 gap-4">
            <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e1b4b]/70 via-[#111827]/70 to-[#0f172a]/70 p-5 shadow-2xl shadow-purple-950/30 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Layers size={18} className="text-violet-300" />
                        Project Runtime Overview
                    </h2>
                    {loading ? <span className="text-xs text-gray-400">Refreshing...</span> : null}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                    {Object.entries(services).map(([name, service]) => (
                        <div key={name} className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold capitalize text-white">{name}</p>
                                <StatusPill status={service.status} />
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">{service.details}</p>
                            {name === 'queue' ? (
                                <div className="mt-2 text-xs text-violet-200/90">
                                    <span className="mr-3">Messages: {service.messageCount}</span>
                                    <span>Consumers: {service.consumerCount}</span>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
                <h3 className="text-white text-sm uppercase tracking-[0.2em] mb-4">Task Snapshot</h3>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Total Tasks" value={taskStats.total} />
                    <MetricCard label="Pending" value={taskStats.pending} tone="pending" />
                    <MetricCard label="In Progress" value={taskStats.inProgress} tone="progress" />
                    <MetricCard label="Completed" value={taskStats.completed} tone="completed" />
                </div>
            </div>
        </section>
    );
}
