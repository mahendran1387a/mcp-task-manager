import { CheckCircle2, RotateCcw, Rows4, ShieldCheck } from 'lucide-react';

export default function QueueWorkbench({ pending, notifications, onPull, onApprove, onRequeue }) {
    return (
        <section className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white inline-flex items-center gap-2">
                    <Rows4 size={18} className="text-amber-300" />
                    Queue Review & Approval Workbench
                </h3>
                <button
                    onClick={() => onPull(5)}
                    className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-100 text-sm"
                >
                    Pull 5 from queue
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 p-3 bg-black/20">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Pending approval ({pending.length})</p>
                    <div className="space-y-2 max-h-64 overflow-auto pr-1">
                        {pending.length === 0 ? <p className="text-sm text-gray-500 italic">No pulled events waiting for approval.</p> : null}
                        {pending.map((entry) => (
                            <div key={entry.deliveryTag} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                <p className="text-xs text-gray-400">Tag: {entry.deliveryTag}</p>
                                <p className="text-sm text-white font-medium">{entry.event.eventType}</p>
                                <p className="text-xs text-gray-300">Task: {entry.event.task?.title}</p>
                                <div className="mt-2 flex gap-2">
                                    <button onClick={() => onApprove(entry.deliveryTag)} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600/30 border border-emerald-400/30 text-emerald-100 inline-flex items-center gap-1">
                                        <ShieldCheck size={12} /> Approve
                                    </button>
                                    <button onClick={() => onRequeue(entry.deliveryTag)} className="px-3 py-1.5 text-xs rounded-lg bg-rose-600/20 border border-rose-400/30 text-rose-100 inline-flex items-center gap-1">
                                        <RotateCcw size={12} /> Requeue
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 p-3 bg-black/20">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Consumer output ({notifications.length})</p>
                    <div className="space-y-2 max-h-64 overflow-auto pr-1">
                        {notifications.length === 0 ? <p className="text-sm text-gray-500 italic">No approved notifications consumed yet.</p> : null}
                        {notifications.map((event, index) => (
                            <div key={`${event.deliveryTag || index}-${event.timestamp}`} className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
                                <p className="text-sm text-emerald-100 inline-flex items-center gap-2"><CheckCircle2 size={14} />{event.eventType}</p>
                                <p className="text-xs text-emerald-50/80">Task: {event.task?.title}</p>
                                <p className="text-[11px] text-emerald-50/70">Approved: {event.approvedAt ? new Date(event.approvedAt).toLocaleString() : 'n/a'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
