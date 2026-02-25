import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import MusicRecommendations from "../components/MusicRecommendations";
import { exportResultAsPDF } from "../utils/exportPDF";
import api from "../services/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const BAND_COLORS = { delta: "#3b82f6", theta: "#8b5cf6", alpha: "#10b981", beta: "#f59e0b", gamma: "#ef4444" };
const EMOTION_COLORS = { Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444", Calm: "#10b981", Stress: "#8b5cf6" };

const TOOLTIP_STYLE = {
    contentStyle: { background: "rgba(10,11,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 },
    labelStyle: { color: "#94a3b8" }, itemStyle: { color: "#e2e8f0" },
};

const Results = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get(`/results/${id}`)
            .then((res) => setResult(res.data.result))
            .catch(() => setError("Result not found"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-neuro">
            <Navbar />
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="flex gap-1 justify-center mb-4">
                        {[...Array(8)].map((_, i) => <span key={i} className="wave-bar" />)}
                    </div>
                    <p className="text-slate-400">Loading results...</p>
                </div>
            </div>
        </div>
    );

    if (error || !result) return (
        <div className="min-h-screen bg-neuro"><Navbar />
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="text-5xl mb-4">❌</div>
                <p className="text-slate-400">{error || "Result not found"}</p>
                <Link to="/dashboard" className="btn-primary mt-4">Back to Dashboard</Link>
            </div>
        </div>
    );

    // Prepare chart data
    const bandData = Object.entries(result.bandPowers || {}).map(([band, power]) => ({
        band: band.charAt(0).toUpperCase() + band.slice(1), power: parseFloat(power.toFixed(3)), fill: BAND_COLORS[band],
    }));

    const scoreData = Object.entries(result.emotionScores || {}).map(([emotion, score]) => ({
        emotion, score: parseFloat((score * 100).toFixed(1)),
    })).sort((a, b) => b.score - a.score);

    const radarData = Object.entries(result.emotionScores || {}).map(([emotion, score]) => ({
        subject: emotion, A: parseFloat((score * 100).toFixed(1)), fullMark: 100,
    }));

    const confPct = Math.round(result.confidence * 100);

    return (
        <div className="min-h-screen bg-neuro">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
                {/* Header */}
                <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white text-sm mb-3 flex items-center gap-1">
                            ← Back
                        </button>
                        <h1 className="text-3xl font-bold text-white">EEG Analysis Results</h1>
                        <p className="text-slate-400 mt-1">{result.filename} · {new Date(result.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => exportResultAsPDF(result)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                                       bg-indigo-600/20 text-indigo-300 border border-indigo-500/30
                                       hover:bg-indigo-600/40 hover:text-white transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export PDF
                        </button>
                        <Link to="/upload" className="btn-secondary text-sm">New Analysis</Link>
                    </div>
                </div>

                {/* Primary Result Card */}
                <div className="glass-card p-8 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Emotion display */}
                        <div className="text-center md:text-left">
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3">Detected Emotional State</p>
                            <div className="flex items-center gap-4 justify-center md:justify-start mb-4">
                                <span className="text-7xl">
                                    {result.emotion === "Happy" ? "😊" : result.emotion === "Calm" ? "😌" :
                                        result.emotion === "Sad" ? "😢" : result.emotion === "Stress" ? "😰" : "😠"}
                                </span>
                                <div>
                                    <h2 className="text-5xl font-black text-white">{result.emotion}</h2>
                                    <EmotionBadge emotion={result.emotion} size="md" showIcon={false} />
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">{result.interpretation}</p>
                        </div>

                        {/* Confidence gauge */}
                        <div className="text-center">
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Model Confidence</p>
                            <div className="relative w-40 h-40 mx-auto">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 42}`}
                                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - result.confidence)}`}
                                        style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-white">{confPct}%</span>
                                    <span className="text-xs text-slate-500">confidence</span>
                                </div>
                            </div>
                            <div className="mt-3 text-sm text-slate-400">
                                Model: <span className="text-indigo-300 font-medium">{result.modelUsed}</span> ·
                                Time: <span className="text-indigo-300 font-medium">{result.processingTime}ms</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Band Power Chart */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-2">EEG Brainwave Band Powers</h2>
                        <p className="text-xs text-slate-500 mb-4">Power Spectral Density (μV²/Hz) via Welch's method</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={bandData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis dataKey="band" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} μV²/Hz`, "Power"]} />
                                <Bar dataKey="power" radius={[6, 6, 0, 0]}>
                                    {bandData.map((entry) => <Cell key={entry.band} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {bandData.map((b) => (
                                <span key={b.band} className="text-xs flex items-center gap-1 text-slate-400">
                                    <span className="w-2 h-2 rounded-full" style={{ background: b.fill }} />
                                    {b.band}: {b.power}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Emotion Probability Radar */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-2">Emotion Probability Radar</h2>
                        <p className="text-xs text-slate-500 mb-4">Per-class confidence scores from the classifier</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
                                <Radar name="Score" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Probability"]} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Emotion Score Bars */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Per-Emotion Confidence Breakdown</h2>
                    <div className="space-y-3">
                        {scoreData.map(({ emotion, score }) => (
                            <div key={emotion} className="flex items-center gap-4">
                                <EmotionBadge emotion={emotion} size="sm" />
                                <div className="flex-1 progress-bar">
                                    <div className="progress-fill" style={{ width: `${score}%`, background: EMOTION_COLORS[emotion] || "#6366f1" }} />
                                </div>
                                <span className="text-sm font-semibold text-white w-12 text-right">{score}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interpretation */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-3">🧬 Clinical Interpretation</h2>
                    <p className="text-slate-300 leading-relaxed">{result.interpretation || "No interpretation available."}</p>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Primary Emotion", val: result.emotion },
                            { label: "Model Used", val: result.modelUsed },
                            { label: "Confidence", val: `${confPct}%` },
                            { label: "Processing Time", val: `${result.processingTime}ms` },
                        ].map(({ label, val }) => (
                            <div key={label} className="glass p-3 text-center rounded-xl">
                                <div className="text-white font-semibold">{val}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Music Recommendations */}
                <MusicRecommendations emotion={result.emotion} />

            </main>
        </div>
    );
};

export default Results;
