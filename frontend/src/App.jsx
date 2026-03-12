import React, { useState } from "react";
import URLScanner from "./components/URLScanner";
import SMSAnalyzer from "./components/SMSAnalyzer";
import QRScanner from "./components/QRScanner";
import ThreatFeed from "./components/ThreatFeed";
import { Shield, Activity, AlertTriangle, CheckCircle } from "lucide-react";

function App() {

    const [stats, setStats] = useState({
        total: 0,
        safe: 0,
        suspicious: 0,
        phishing: 0
    });

    const [feedEvents, setFeedEvents] = useState([]);

    const updateThreatFeed = (message) => {
        const newEvent = {
            id: Date.now(),
            message,
            time: new Date().toLocaleTimeString()
        };
        setFeedEvents(prev => [newEvent, ...prev].slice(0, 20));
    };

    const updateStats = (risk) => {
        setStats(prev => {
            const newStats = { ...prev };
            newStats.total += 1;

            if (risk < 30) newStats.safe += 1;
            else if (risk < 70) newStats.suspicious += 1;
            else newStats.phishing += 1;

            return newStats;
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">

            {/* HEADER */}
            <div className="border-b border-slate-800 p-6 flex items-center gap-3">
                <Shield className="text-cyan-400" size={32} />
                <h1 className="text-2xl font-bold">
                    CyberSentinel
                </h1>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-4 gap-4 p-6">

                <StatCard title="Total Scans" value={stats.total} icon={<Activity />} />

                <StatCard title="Safe" value={stats.safe} icon={<CheckCircle />} color="text-green-400" />

                <StatCard title="Suspicious" value={stats.suspicious} icon={<AlertTriangle />} color="text-yellow-400" />

                <StatCard title="Phishing" value={stats.phishing} icon={<AlertTriangle />} color="text-red-400" />

            </div>

            {/* THREAT FEED */}
            <div className="px-6 pb-2">
                <ThreatFeed events={feedEvents} />
            </div>

            {/* SCANNERS */}
            <div className="grid md:grid-cols-3 gap-6 p-6">

                <URLScanner updateStats={updateStats} updateThreatFeed={updateThreatFeed} />
                <SMSAnalyzer updateStats={updateStats} updateThreatFeed={updateThreatFeed} />
                <QRScanner updateStats={updateStats} updateThreatFeed={updateThreatFeed} />

            </div>

        </div>
    );
}

const StatCard = ({ title, value, icon, color = "text-cyan-400" }) => {

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">

            <div>
                <p className="text-xs text-slate-400">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>

            <div className={color}>
                {icon}
            </div>

        </div>
    );
};

export default App;
