import React, { useState } from 'react';
import axios from 'axios';
import { MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import RiskMeter from './RiskMeter';
import { calculateRisk } from '../utils/risk';

const SMSAnalyzer = ({ updateStats, updateThreatFeed }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleScan = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/predict', { 
                input_type: "sms", 
                data: message 
            });

            const data = response.data;
            console.log("SMS RESPONSE:", data);

            if (!data || !data.label) {
                throw new Error("Invalid SMS response");
            }

            setResult(data);
            
            const risk = calculateRisk(data);
            console.log("Risk Score:", risk);

            if (updateStats) {
                updateStats(risk);

                if (updateThreatFeed) {
                    if (data.label === "phishing") {
                        updateThreatFeed("⚠️ Suspicious SMS detected");
                    } else {
                        updateThreatFeed("✅ Legitimate SMS verified");
                    }
                }
            }
        } catch (error) {
            console.error('SMS analysis failed:', error);
            alert("SMS analysis failed. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate risk for display
    const riskValue = calculateRisk(result);

    return (
        <div className="space-y-6">
            <div className="card bg-slate-900/50 border-slate-800">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <MessageSquare className="mr-2 text-primary-400" />
                    SMS Scanner
                </h2>
                <form onSubmit={handleScan} className="space-y-4">
                    <textarea
                        className="input w-full h-32 resize-none"
                        placeholder="Paste SMS content here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
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
                            'Analyze SMS'
                        )}
                    </button>
                </form>
            </div>

            {result && (
                <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 border-l-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    riskValue >= 70 ? 'border-red-500' : riskValue >= 30 ? 'border-yellow-500' : 'border-green-500'
                    }`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Message Analysis</h3>
                            {riskValue >= 70
                                ? <AlertTriangle className="text-red-500" size={24} />
                                : riskValue >= 30
                                    ? <AlertTriangle className="text-yellow-500" size={24} />
                                    : <Shield className="text-green-500" size={24} />}
                        </div>

                        <p className="text-sm text-slate-400 italic bg-slate-900/50 p-3 rounded-lg overflow-hidden line-clamp-3">
                            "{result.message}"
                        </p>

                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                            riskValue >= 70 ? 'bg-red-500/20 text-red-400' : riskValue >= 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                            }`}>
                            {riskValue >= 70 ? 'SMISHING / SPAM' : riskValue >= 30 ? 'SUSPICIOUS' : 'AUTHENTIC'}
                        </div>

                        <RiskMeter riskValue={calculateRisk(result)} />

                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-400">
                            AI Analysis:
                            <ul className="list-disc ml-4 mt-1">
                                <li>Natural Language Processing</li>
                                <li>DistilBERT Transformer inference</li>
                                <li>Threat Intelligence Validation</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SMSAnalyzer;
