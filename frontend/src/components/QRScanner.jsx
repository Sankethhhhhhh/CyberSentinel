import React, { useState, useRef } from 'react';
import axios from 'axios';
import jsQR from 'jsqr';
import { QrCode, Upload, Shield, AlertTriangle, ChevronRight, ChevronDown, Copy, RotateCw, Scan, X, Clock, BarChart3 } from 'lucide-react';
import RiskMeter from './RiskMeter';
import { calculateRisk } from '../utils/risk';
import { generateExplanations } from '../utils/explain';

const QRScanner = ({ onScanComplete }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [extractedUrl, setExtractedUrl] = useState('');
    const [showExplanation, setShowExplanation] = useState(false);
    const [scanDuration, setScanDuration] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setExtractedUrl('');
        setScanDuration(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleScan = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setResult(null);
        setShowExplanation(false);
        setCopied(false);

        const startTime = performance.now();

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

                const response = await axios.post('/api/predict', {
                    input_type: "url",
                    data: urlToScan
                });

                const data = response.data;
                const duration = performance.now() - startTime;
                setScanDuration(duration);

                if (!data || !data.label) {
                    throw new Error("Invalid backend response");
                }

                setResult(data);

                if (onScanComplete) {
                    onScanComplete('qr', data, duration);
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

    const handleCopy = () => {
        navigator.clipboard.writeText(extractedUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleScanAgain = () => {
        setResult(null);
        setShowExplanation(false);
        setScanDuration(null);
        setCopied(false);
        clearFile();
    };

    return (
        <div className="space-y-4">
            {/* Input Card */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center">
                        <QrCode size={18} className="text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-200">QR Scanner</h2>
                        <p className="text-[10px] text-slate-500">Scan QR codes for malicious URLs</p>
                    </div>
                </div>

                <form onSubmit={handleScan} className="space-y-3">
                    {/* Upload Area */}
                    <div className="relative">
                        {preview ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-primary-500/30 bg-slate-900/60">
                                <img src={preview} alt="QR Preview" className="w-full h-44 object-contain p-4" />
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-900/80 border border-slate-700/50 flex items-center justify-center hover:bg-slate-800 transition-colors"
                                >
                                    <X size={14} className="text-slate-400" />
                                </button>
                                <div className="absolute bottom-2 left-2 right-2 text-center">
                                    <span className="text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700/30">
                                        {file?.name || 'QR image loaded'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-44 rounded-xl border-2 border-dashed border-slate-700/50 bg-slate-900/40 cursor-pointer hover:border-primary-500/40 hover:bg-slate-900/60 transition-all duration-200 group">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="h-12 w-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center group-hover:border-primary-500/30 group-hover:bg-slate-800 transition-all duration-200 mb-3">
                                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary-400 transition-colors" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">Upload QR Image</p>
                                    <p className="text-[10px] text-slate-600 mt-1">PNG, JPG, WEBP</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                            </label>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Scan size={16} />
                                Scan QR Code
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
                                    <h3 className="text-sm font-bold text-slate-200">QR Analysis</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`badge text-[10px] ${
                                            riskValue >= 70 
                                                ? "bg-red-500/15 text-red-400 border border-red-500/20" 
                                                : riskValue >= 30 
                                                    ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" 
                                                    : "bg-green-500/15 text-green-400 border border-green-500/20"
                                            }`}>
                                            {riskValue >= 70 ? "PHISHING" : (riskValue >= 30 ? "SUSPICIOUS" : "SAFE")}
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

                        {/* Extracted URL with Copy */}
                        <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Extracted URL</p>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-primary-400 transition-colors"
                                >
                                    <Copy size={11} />
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-primary-300 break-all font-mono leading-relaxed">{extractedUrl}</p>
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

                        {/* Pipeline Info */}
                        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-400 mb-3">AI Analysis Pipeline</p>
                            <ul className="space-y-2">
                                {[
                                    'Client-side QR Decoding (jsQR)',
                                    'Unified URL Phishing Pipeline',
                                    'Real-time Probability Scoring'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2.5 text-xs text-slate-500">
                                        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary-500/10 text-[9px] font-bold text-primary-400">
                                            {i + 1}
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {generateExplanations(result, extractedUrl).length > 0 && (
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
                                        {generateExplanations(result, extractedUrl).map((item, idx) => (
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

export default QRScanner;
