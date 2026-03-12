import React, { useState } from 'react';
import axios from 'axios';
import { QrCode, Upload, Shield, AlertTriangle } from 'lucide-react';
import RiskMeter from './RiskMeter';

const calculateRisk = (data) => {

    if (!data) return 0;

    // trusted domains must always be safe
    if (data.reason === "trusted_domain") {
        return 0;
    }

    const confidence = data.confidence_score ?? 0;

    if (data.prediction === "phishing") {
        return Math.round(confidence * 100);
    }

    return Math.round((1 - confidence) * 100);
};

const QRScanner = ({ updateStats, updateThreatFeed }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleScan = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/analyze-qr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = response.data;
            setResult(data);

            if (updateStats) {
                const risk = calculateRisk(data);
                updateStats(risk);

                if (updateThreatFeed) {
                    if (data.prediction === "phishing") {
                        updateThreatFeed("QR scan flagged malicious");
                    } else {
                        updateThreatFeed("QR code verified safe");
                    }
                }
            }
        } catch (error) {
            console.error('QR scan failed:', error);
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
                    <QrCode className="mr-2 text-primary-400" />
                    QR Scanner
                </h2>

                <form onSubmit={handleScan} className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-900 hover:bg-slate-800 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {preview ? (
                                    <img src={preview} alt="QR Preview" className="h-24 w-24 object-contain" />
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                        <p className="text-xs text-slate-500 font-semibold tracking-tight">Upload QR Image</p>
                                    </>
                                )}
                            </div>
                            <input type="file" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="btn btn-primary w-full disabled:opacity-50 text-sm py-3"
                    >
                        {loading ? 'Analyzing...' : 'Scan QR Code'}
                    </button>
                </form>
            </div>

            {result && (
                <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 border-l-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${result.prediction === 'phishing' ? 'border-red-500' : 'border-green-500'
                    }`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">QR Analysis</h3>
                            {result.prediction === 'phishing'
                                ? <AlertTriangle className="text-red-500" size={24} />
                                : <Shield className="text-green-500" size={24} />}
                        </div>

                        <div className="bg-slate-900 p-2 rounded">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Extracted URL</p>
                            <p className="text-xs text-primary-400 break-all">{result.extracted_url}</p>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${result.prediction === 'phishing' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                            }`}>
                            {result.prediction.toUpperCase()}
                        </div>

                        <RiskMeter riskValue={riskValue} />

                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-400">
                            AI Analysis:
                            <ul className="list-disc ml-4 mt-1">
                                <li>QR Code Decoding (pyzbar)</li>
                                <li>XGBoost URL Classification</li>
                                <li>Threat Intelligence Validation</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
