import React, { useState } from 'react';
import axios from 'axios';
import { MessageSquare, Shield, AlertTriangle, ChevronRight, ChevronDown, Copy, RotateCw, Clock, BarChart3 } from 'lucide-react';
import RiskMeter from './RiskMeter';
import { calculateRisk } from '../utils/risk';
import { generateExplanations } from '../utils/explain';

const SMSAnalyzer = ({ onScanComplete }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [scanDuration, setScanDuration] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setShowExplanation(false);
        setCopied(false);

        const startTime = performance.now();

        try {
            const response = await axios.post('/api/predict', { 
                input_type: "sms", 
                data: message 
            });

            const data = response.data;
            const duration = performance.now() - startTime;
            setScanDuration(duration);

            if (!data || !data.label) {
                throw new Error("Invalid SMS response");
            }

            setResult(data);

            if (onScanComplete) {
                onScanComplete('sms', data, duration);
            }

        } catch (error) {
            console.error('SMS analysis failed:', error);
            alert("SMS analysis failed. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    const riskValue = calculateRisk(result);

    const handleCopy = () => {
        navigator.clipboard.writeText(message).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleScanAgain = () => {
        setResult(null);
        setShowExplanation(false);
        setScanDuration(null);
        setCopied(false);
        setMessage('');
    };

    return (
        <div className="space-y-4">
            {/* Input Card */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center">
                        <MessageSquare size={18} className="text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-200">SMS Scanner</h2>
                        <p className="text-[10px] text-slate-500">Detect smishing and spam messages</p>
                    </div>
                </div>

                <form onSubmit={handleScan} className="space-y-3">
                    <textarea
                        className="input-modern h-28 resize-none leading-relaxed"
                        placeholder="Paste SMS content here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />
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
                                Analyze SMS
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
                                    <h3 className="text-sm font-bold text-slate-200">Message Analysis</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`badge text-[10px] ${
                                            riskValue >= 70 
                                                ? "bg-red-500/15 text-red-400 border border-red-500/20" 
                                                : riskValue >= 30 
                                                    ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" 
                                                    : "bg-green-500/15 text-green-400 border border-green-500/20"
                                            }`}>
                                            {riskValue >= 70 ? 'SMISHING / SPAM' : riskValue >= 30 ? 'SUSPICIOUS' : 'AUTHENTIC'}
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

                        {/* Message Display with Copy */}
                        <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Analyzed Content</p>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary-400 transition-colors"
                                >
                                    <Copy size={11} />
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-slate-300 italic leading-relaxed overflow-hidden line-clamp-4">
                                "{result.message}"
                            </p>
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

                        {generateExplanations(result, message).length > 0 && (
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
                                        {generateExplanations(result, message).map((item, idx) => (
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

export default SMSAnalyzer;
