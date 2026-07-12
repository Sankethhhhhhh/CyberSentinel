import React from 'react';

const RiskMeter = ({ riskValue, showLabel = true }) => {
    const percentage = Math.min(100, Math.max(0, Math.round(riskValue)));

    let barColor = "from-green-500 to-emerald-400";
    let labelColor = "text-green-400";
    let bgColor = "bg-green-500/8";
    let borderColor = "border-green-500/15";
    let label = "SAFE";

    if (percentage >= 70) {
        barColor = "from-red-500 to-rose-400";
        labelColor = "text-red-400";
        bgColor = "bg-red-500/8";
        borderColor = "border-red-500/15";
        label = "PHISHING";
    } else if (percentage >= 30) {
        barColor = "from-yellow-500 to-amber-400";
        labelColor = "text-yellow-400";
        bgColor = "bg-yellow-500/8";
        borderColor = "border-yellow-500/15";
        label = "SUSPICIOUS";
    }

    return (
        <div className="space-y-3">
            {showLabel && (
                <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tracking-widest ${labelColor}`}>{label}</span>
                    <span className="text-xs text-slate-400 font-mono font-medium">{percentage}% Threat Level</span>
                </div>
            )}

            <div className="relative h-3 bg-slate-800/60 rounded-full overflow-hidden border border-slate-700/40">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out shadow-lg`}
                    style={{ width: `${percentage}%` }}
                />
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    style={{
                        backgroundSize: '200% 100%',
                        width: `${percentage}%`,
                        animation: 'shimmer 2s linear infinite',
                    }}
                />
            </div>

            <div className="flex justify-between text-[9px] text-slate-600 font-medium px-0.5">
                <span>SAFE (0%)</span>
                <span>SUSPICIOUS (30%)</span>
                <span>PHISHING (70%)</span>
            </div>
        </div>
    );
};

export default RiskMeter;
