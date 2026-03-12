import React from 'react';
import { Activity, ShieldCheck, AlertCircle, Zap } from 'lucide-react';

const AttackStats = ({ stats }) => {
    const statCards = [
        { label: 'Total Scans', value: stats.total, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Safe', value: stats.safe, icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { label: 'Suspicious', value: stats.suspicious, icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/20' },
        { label: 'Phishing', value: stats.phishing, icon: Zap, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, idx) => (
                <div key={idx} className={`card ${stat.bg} ${stat.border} p-4 flex items-center justify-between`}>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                    <stat.icon size={24} className={stat.color} />
                </div>
            ))}
        </div>
    );
};

export default AttackStats;
