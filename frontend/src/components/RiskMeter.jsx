import React from 'react';

const RiskMeter = ({ riskValue }) => {
    const percentage = Math.min(100, Math.max(0, Math.round(riskValue)));

    let barColor = "bg-green-500";
    let labelColor = "text-green-400";
    let label = "SAFE";

    if (percentage >= 70) {
        barColor = "bg-red-500";
        labelColor = "text-red-400";
        label = "PHISHING";
    } else if (percentage >= 30) {
        barColor = "bg-yellow-400";
        labelColor = "text-yellow-400";
        label = "SUSPICIOUS";
    }

    return (
        <div className="space-y-1.5 mt-3">
            {/* Top row: label + score */}
            <div className="flex justify-between text-xs">
                <span className={`font-bold tracking-widest ${labelColor}`}>{label}</span>
                <span className="text-slate-400 font-mono">Threat Level: {percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Scale labels */}
            <div className="flex justify-between text-[10px] text-slate-500 px-0.5">
                <span>SAFE</span>
                <span>SUSPICIOUS</span>
                <span>PHISHING</span>
            </div>
        </div>
    );
};

export default RiskMeter;
