import React, { useState } from 'react';
import axios from 'axios';
import { Search, Shield, AlertTriangle } from 'lucide-react';
import RiskMeter from './RiskMeter';

const URLScanner = ({ updateStats, updateThreatFeed }) => {

    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [riskValue, setRiskValue] = useState(0);
    const calculateRisk = (data) => {
        if (!data) return 0;

        // trusted domains should always be safe
        if (data.reason === "trusted_domain") return 0;

        const confidence = data.confidence_score ?? 0.5;

        if (data.prediction === "phishing") {
            return Math.round(confidence * 100);
        }

        return Math.round((1 - confidence) * 100);
    };

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/analyze-url', { url });
            const data = response.data;

            const risk = calculateRisk(data);

            setResult(data);
            setRiskValue(risk);

            if (updateStats) updateStats(risk);

            if (updateThreatFeed) {
                if (data.prediction === "phishing") {
                    updateThreatFeed("Phishing URL blocked");
                } else if (risk >= 40) {
                    updateThreatFeed("Suspicious URL detected");
                } else {
                    updateThreatFeed("Benign URL confirmed");
                }
            }

        } catch (error) {
            console.error("Scan failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            <div className="card bg-slate-900/50 border-slate-800">

                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <Search className="mr-2 text-primary-400" />
                    URL Scanner
                </h2>

                <form onSubmit={handleScan} className="flex flex-col gap-4">

                    <input
                        type="text"
                        className="input w-full"
                        placeholder="Enter URL to scan..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                Scanning...
                            </>
                        ) : (
                            "Analyze URL"
                        )}
                    </button>

                </form>
            </div>

            {result && (

                <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 border-l-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    riskValue >= 70 ? "border-red-500" : riskValue >= 30 ? "border-yellow-500" : "border-green-500"
                    }`}>

                    <div className="space-y-4">

                        <div className="flex items-center justify-between">

                            <h3 className="text-lg font-semibold">
                                Scan Result
                            </h3>

                            {riskValue >= 70
                                ? <AlertTriangle className="text-red-500" size={24} />
                                : riskValue >= 30
                                    ? <AlertTriangle className="text-yellow-500" size={24} />
                                    : <Shield className="text-green-500" size={24} />
                            }

                        </div>

                        <p className="text-sm text-slate-400 break-all bg-slate-900/50 p-2 rounded">
                            {result.url}
                        </p>

                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                            riskValue >= 70 ? "bg-red-500/20 text-red-400" : riskValue >= 30 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"
                            }`}>
                            {riskValue >= 70 ? "PHISHING" : riskValue >= 30 ? "SUSPICIOUS" : "SAFE"}
                        </div>

                        <RiskMeter riskValue={riskValue} />

                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-400">
                            AI Analysis:
                            <ul className="list-disc ml-4 mt-1">
                                <li>Lexical URL Features</li>
                                <li>XGBoost Classification</li>
                                <li>Threat Intelligence Validation</li>
                            </ul>
                        </div>

                    </div>

                </div>
            )}

        </div>
    );
};

export default URLScanner;