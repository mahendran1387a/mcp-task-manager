import { useMemo, useState } from 'react';
import { Bot, Code2, Play, Wrench } from 'lucide-react';

export default function ToolDiscoveryPanel({ tools, onInvoke, invokeResult, loading }) {
    const [selectedTool, setSelectedTool] = useState('');
    const [payload, setPayload] = useState('{}');

    const activeTool = useMemo(
        () => tools.find((tool) => tool.name === selectedTool) || tools[0],
        [selectedTool, tools]
    );

    const handleInvoke = async () => {
        if (!activeTool) {
            return;
        }

        let parsedPayload = {};
        try {
            parsedPayload = payload.trim() ? JSON.parse(payload) : {};
        } catch {
            onInvoke(activeTool.name, null, 'Invalid JSON payload');
            return;
        }

        await onInvoke(activeTool.name, parsedPayload);
    };

    return (
        <section className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white inline-flex items-center gap-2">
                    <Bot size={18} className="text-cyan-300" />
                    MCP Tool Discovery
                </h3>
                <span className="text-xs text-gray-400">{loading ? 'Discovering...' : `${tools.length} tools`}</span>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 p-3 bg-black/20">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Exposed tools</p>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                        {tools.map((tool) => (
                            <button
                                key={tool.name}
                                onClick={() => {
                                    setSelectedTool(tool.name);
                                    setPayload(JSON.stringify({}, null, 2));
                                }}
                                className={`w-full text-left rounded-lg border p-3 transition ${activeTool?.name === tool.name
                                    ? 'border-fuchsia-400/40 bg-fuchsia-500/10'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <p className="text-sm font-semibold text-white inline-flex items-center gap-2"><Wrench size={14} />{tool.name}</p>
                                <p className="text-xs text-gray-400 mt-1">{tool.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 p-3 bg-black/20">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Invoke selected tool</p>
                    <div className="space-y-3">
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                            {activeTool ? activeTool.name : 'No tool selected'}
                        </div>
                        <label className="text-xs text-gray-400 flex items-center gap-2"><Code2 size={14} />Arguments (JSON)</label>
                        <textarea
                            value={payload}
                            onChange={(event) => setPayload(event.target.value)}
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-xs font-mono text-gray-200 outline-none focus:border-cyan-400/40"
                            spellCheck={false}
                        />
                        <button
                            onClick={handleInvoke}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-medium inline-flex items-center gap-2"
                        >
                            <Play size={14} /> Run Tool
                        </button>
                        {invokeResult ? (
                            <pre className="text-xs bg-black/40 border border-white/10 rounded-lg p-3 text-emerald-200 whitespace-pre-wrap">{invokeResult}</pre>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
