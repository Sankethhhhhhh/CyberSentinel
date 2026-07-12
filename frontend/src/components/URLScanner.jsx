import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Search, Shield, AlertTriangle, ExternalLink, ChevronRight, ChevronDown, Copy, RotateCw, Clock, BarChart3 } from 'lucide-react';
import RiskMeter from './RiskMeter';
import { calculateRisk } from '../utils/risk';
import { generateExplanations } from '../utils/explain';

const URLScanner = ({ onScanComplete }) => {

    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [riskValue, setRiskValue] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [scanDuration, setScanDuration] = useState(null);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef(null);

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setShowExplanation(false);
        setCopied(false);

        const startTime = performance.now();

        try {
            const response = await axios.post('/api/predict', { 
                input_type: "url", 
                data: url 
            });
            const data = response.data;
            const duration = performance.now() - startTime;
            setScanDuration(duration);

            const risk = calculateRisk(data);

            setResult(data);
            setRiskValue(risk);

            if (onScanComplete) {
                onScanComplete('url', data, duration);
            }

        } catch (error) {
            console.error("Scan failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleScanAgain = () => {
        setResult(null);
        setRiskValue(0);
        setShowExplanation(false);
        setScanDuration(null);
        setCopied(false);
        setUrl('');
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className="space-y-4">

            {/* Input Card */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center">
                        <Search size={18} className="text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-200">URL Scanner</h2>
                        <p className="text-[10px] text-slate-500">Analyze URLs for phishing threats</p>
                    </div>
                </div>

                <form onSubmit={handleScan} className="space-y-3">
                    <div className="relative">
                        <ExternalLink size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            ref={inputRef}
                            type="text"
                            className="input-modern pl-10"
                            placeholder="Enter URL to scan..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            <>
                                Analyze URL
                                <ChevronRight size={16} />
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Result Card */}
            {result && (
                <div className={`card-result border-l-[3px] animate-in ${
                    riskValue >= 70 
                        ? "bg-red-500/5 border-red-500" 
                        : riskValue >= 30 
                            ? "bg-yellow-500/5 border-yellow-500" 
                            : "bg-green-500/5 border-green-500"
                    }`}>

                    <div className="space-y-5">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {riskValue >= 70
                                    ? <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><AlertTriangle className="text-red-500" size={20} /></div>
                                    : riskValue >= 30
                                        ? <div className="h-10 w-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"><AlertTriangle className="text-yellow-500" size={20} /></div>
                                        : <div className="h-10 w-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center"><Shield className="text-green-500" size={20} /></div>
                                }
                                <div>
                                    <h3 className="text-sm font-bold text-slate-200">Scan Result</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`badge text-[10px] ${
                                            riskValue >= 70 
                                                ? "bg-red-500/15 text-red-400 border border-red-500/20" 
                                                : riskValue >= 30 
                                                    ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" 
                                                    : "bg-green-500/15 text-green-400 border border-green-500/20"
                                            }`}>
                                            {riskValue >= 70 ? "PHISHING" : riskValue >= 30 ? "SUSPICIOUS" : "SAFE"}
                                        </span>
                                        {scanDuration && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock size={10} />
                                                {(scanDuration / 1000).toFixed(1)}s
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* URL Display with Copy */}
                        <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Scanned URL</p>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary-400 transition-colors"
                                >
                                    <Copy size={11} />
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-slate-300 break-all font-mono leading-relaxed">{url}</p>
                        </div>

                        <RiskMeter riskValue={calculateRisk(result)} />

                        {/* Confidence Score */}
                        {result.confidence !== undefined && (
                            <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-3">
                                <BarChart3 size={16} className="text-primary-400" />
                                <div className="flex-1">
                                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Confidence Score</p>
                                    <p className="text-sm font-bold text-primary-300 font-mono">
                                        {(result.confidence * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Threat Intel */}
                        {result?.threat_intel && (
                            <ThreatIntelBadge intel={result.threat_intel} />
                        )}

                        {/* Explanation */}
                        {generateExplanations(result, url).length > 0 && (
                            <div className="border-t border-slate-700/30 pt-4">
                                <button
                                    onClick={() => setShowExplanation(!showExplanation)}
                                    className="flex items-center gap-2 text-xs text-primary-400 hover:text-primary-300 transition-colors w-full font-medium"
                                >
                                    {showExplanation ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    {showExplanation ? 'Hide' : 'Show'} Detection Explanation
                                </button>

                                {showExplanation && (
                                    <div className="mt-3 space-y-2 animate-in">
                                        {generateExplanations(result, url).map((item, idx) => (
                                            <div key={idx} className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/25 text-xs space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base leading-none">{item.emoji}</span>
                                                    <span className="font-semibold text-slate-200">{item.title}</span>
                                                </div>
                                                <p className="text-slate-500 pl-7 leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Scan Again */}
                        <button
                            onClick={handleScanAgain}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <RotateCw size={14} />
                            Scan Again
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
};

const ThreatIntelBadge = ({ intel }) => {
    const isUnavailable = intel.intel_sources === "unavailable" || !intel.intel_sources;
    const riskPct = intel.final_risk_score !== undefined ? Math.round(intel.final_risk_score * 100) : 0;

    let barColor = "from-green-500 to-emerald-400";
    let textColor = "text-green-400";
    if (riskPct >= 70) { barColor = "from-red-500 to-rose-400"; textColor = "text-red-400"; }
    else if (riskPct >= 30) { barColor = "from-yellow-500 to-amber-400"; textColor = "text-yellow-400"; }

    return (
        <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary-400" />
                <span className="text-xs font-semibold text-primary-400">VirusTotal Threat Intelligence</span>
            </div>
            {isUnavailable ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="text-slate-600">⚪</span> Not Configured
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-medium">Combined Risk</span>
                        <span className={`font-mono font-bold ${textColor}`}>{riskPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500 shadow-lg`} style={{ width: `${riskPct}%` }} />
                    </div>
                    {intel.intel_sources && (
                        <p className="text-[10px] text-slate-600">Sources: {intel.intel_sources}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default URLScanner;
