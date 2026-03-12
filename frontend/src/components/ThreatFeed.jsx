import { Activity, AlertTriangle, Shield, ShieldAlert } from "lucide-react";

// Icon + colour determined by the event message content
const classify = (message) => {
    const m = message.toLowerCase();
    if (m.includes("phishing") || m.includes("malicious") || m.includes("blocked"))
        return { color: "text-red-400", bg: "bg-red-500/10", icon: ShieldAlert };
    if (m.includes("suspicious") || m.includes("flagged"))
        return { color: "text-yellow-400", bg: "bg-yellow-500/10", icon: AlertTriangle };
    return { color: "text-green-400", bg: "bg-green-500/10", icon: Shield };
};

const ThreatFeed = ({ events = [] }) => {
    const visibleEvents = events.slice(0, 5);
    const hiddenCount = events.length - visibleEvents.length;

    const classifyEvent = (message) => {
        const text = message.toLowerCase();
        if (text.includes("phishing") || text.includes("malicious") || text.includes("blocked"))
            return "bg-red-500/20 text-red-400";
        if (text.includes("suspicious") || text.includes("flagged"))
            return "bg-yellow-500/20 text-yellow-400";
        return "bg-green-500/20 text-green-400";
    };

    return (
        <div className="card bg-slate-900/50 border-slate-800">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                Live Threat Activity
                <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400 font-mono font-normal">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE
                </span>
            </h3>

            {events.length === 0 && (
                <p className="text-slate-500 text-sm py-4">No events yet — run a scan to see results here.</p>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {visibleEvents.map((e, i) => (
                    <div
                        key={e.id || i}
                        className={`flex justify-between px-3 py-2 rounded border border-slate-800/50 ${classifyEvent(e.message)}`}
                    >
                        <span className="text-sm font-medium">{e.message}</span>
                        <span className="text-xs opacity-60 font-mono">{e.time}</span>
                    </div>
                ))}
            </div>

            {hiddenCount > 0 && (
                <div className="text-xs text-slate-500 text-center mt-2">
                    +{hiddenCount} more hidden
                </div>
            )}
        </div>
    );
};

export default ThreatFeed;
