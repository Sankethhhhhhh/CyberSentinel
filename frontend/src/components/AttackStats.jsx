import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
import StatCard from './ui/StatCard';

const AttackStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Scans" value={stats.total} icon={Activity} type="total" delay={0} />
            <StatCard label="Safe" value={stats.safe} icon={ShieldCheck} type="safe" delay={80} />
            <StatCard label="Suspicious" value={stats.suspicious} icon={AlertTriangle} type="suspicious" delay={160} />
            <StatCard label="Phishing" value={stats.phishing} icon={Zap} type="phishing" delay={240} />
        </div>
    );
};

export default AttackStats;
