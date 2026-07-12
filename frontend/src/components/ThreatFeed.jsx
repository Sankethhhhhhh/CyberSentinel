import { ShieldAlert, AlertTriangle, Shield, Clock } from "lucide-react";

const classify = (message) => {
    const m = message.toLowerCase();
    if (m.includes("phishing") || m.includes("malicious") || m.includes("blocked"))
        return { color: "text-red-400", dot: "bg-red-500", border: "border-red-500/20", bg: "bg-red-500/5", icon: ShieldAlert };
    if (m.includes("suspicious") || m.includes("flagged"))
        return { color: "text-yellow-400", dot: "bg-yellow-500", border: "border-yellow-500/20", bg: "bg-yellow-500/5", icon: AlertTriangle };
    return { color: "text-green-400", dot: "bg-green-500", border: "border-green-500/20", bg: "bg-green-500/5", icon: Shield };
};

const ThreatFeed = ({ events = [], maxHeight = "280px", compact = false }) => {
    const visibleEvents = events.slice(0, compact ? 3 : 5);
    const hiddenCount = events.length - visibleEvents.length;

    if (compact) {
        return (
            <div className="space-y-2">
                {visibleEvents.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 text-center">No recent activity</p>
                )}
                {visibleEvents.map((e, i) => {
                    const style = classify(e.message);
                    const Icon = style.icon;
                    return (
                        <div key={e.id || i} className={`${style.bg} ${style.border} border rounded-lg px-3 py-2 flex items-center gap-2.5 animate-in`}
                            style={{ animationDelay: `${i * 50}ms` }}>
                            <Icon size={12} className={style.color} />
                            <p className="text-[11px] font-medium text-slate-300 flex-1 truncate">{e.message}</p>
                            <span className="text-[10px] text-slate-600 font-mono shrink-0">{e.time}</span>
                        </div>
                    );
                })}
                {hiddenCount > 0 && (
                    <p className="text-[10px] text-slate-600 text-center">+{hiddenCount} more</p>
                )}
            </div>
        )
    }

    return (
        <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center">
                    <ShieldAlert size={16} className="text-primary-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-200">Live Threat Activity</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{events.length} events tracked</p>
                </div>
                {events.length > 0 && (
                    <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-mono font-semibold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        LIVE
                    </span>
                )}
            </div>

            {events.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShieldAlert size={32} className="text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No events yet</p>
                    <p className="text-xs text-slate-600 mt-1">Run a scan to see results here.</p>
                </div>
            )}

            <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight }}>
                {visibleEvents.map((e, i) => {
                    const style = classify(e.message);
                    const Icon = style.icon;
                    return (
                        <div
                            key={e.id || i}
                            className={`${style.bg} ${style.border} border rounded-xl px-4 py-3 flex items-start gap-3 animate-in`}
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className={`h-7 w-7 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0 mt-0.5`}>
                                <Icon size={14} className={style.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium ${style.color} leading-relaxed`}>{e.message}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0 mt-0.5">
                                <Clock size={10} />
                                {e.time}
                            </div>
                        </div>
                    );
                })}
            </div>

            {hiddenCount > 0 && (
                <div className="mt-3 text-center">
                    <span className="text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/30 font-medium">
                        +{hiddenCount} older event{hiddenCount > 1 ? 's' : ''} hidden
                    </span>
                </div>
            )}
        </div>
    );
};

export default ThreatFeed;
