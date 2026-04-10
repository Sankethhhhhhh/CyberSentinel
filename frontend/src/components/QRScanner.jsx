import React, { useState } from 'react';
import axios from 'axios';
import jsQR from 'jsqr';
import { QrCode, Upload, Shield, AlertTriangle } from 'lucide-react';
import RiskMeter from './RiskMeter';
import { calculateRisk } from '../utils/risk';



const QRScanner = ({ updateStats, updateThreatFeed }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [extractedUrl, setExtractedUrl] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null); // Reset previous results
        }
    };

    const handleScan = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);

        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = async () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, canvas.width, canvas.height);

                if (!code) {
                    alert("No QR code detected in the image.");
                    setLoading(false);
                    return;
                }

                const urlToScan = code.data;
                setExtractedUrl(urlToScan);
                console.log("Extracted QR URL:", urlToScan);

                // Step 2: Send extracted URL to backend via proxy
                const response = await axios.post('/api/predict', {
                    input_type: "url",
                    data: urlToScan
                });

                const data = response.data;

                if (!data || !data.label) {
                    throw new Error("Invalid backend response");
                }

                setResult(data);

                console.log("API Result:", data);
                const risk = calculateRisk(data);
                console.log("Risk Score:", risk);

                if (updateStats) {
                    updateStats(risk);

                    if (updateThreatFeed) {
                        if (data.label === "phishing") {
                            updateThreatFeed(`⚠️ QR Phishing: ${urlToScan}`);
                        } else {
                            updateThreatFeed(`✅ QR Safe: ${urlToScan}`);
                        }
                    }
                }
            } catch (error) {
                console.error("QR scan failed:", error);
                alert("QR Analysis failed. Check console for details.");
            } finally {
                setLoading(false);
            }
        };
    };

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
                <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 border-l-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    riskValue >= 70 ? 'border-red-500' : riskValue >= 30 ? 'border-yellow-500' : 'border-green-500'
                    }`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">QR Analysis</h3>
                            {riskValue >= 70 ? <AlertTriangle className="text-red-500" size={24} /> : (riskValue >= 30 ? <AlertTriangle className="text-yellow-500" size={24} /> : <Shield className="text-green-500" size={24} />)}
                        </div>

                        <div className="bg-slate-900 p-2 rounded">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Extracted URL</p>
                            <p className="text-xs text-primary-400 break-all">{extractedUrl}</p>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                            riskValue >= 70 ? 'bg-red-500/20 text-red-400' : riskValue >= 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                            }`}>
                            {riskValue >= 70 ? "PHISHING" : (riskValue >= 30 ? "SUSPICIOUS" : "SAFE")}
                        </div>

                        <RiskMeter riskValue={calculateRisk(result)} />

                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-400">
                            AI Analysis:
                            <ul className="list-disc ml-4 mt-1">
                                <li>Client-side QR Decoding (jsQR)</li>
                                <li>Unified URL Phishing Pipeline</li>
                                <li>Real-time Probability Scoring</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
