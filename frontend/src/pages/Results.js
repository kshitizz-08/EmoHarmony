import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import MusicRecommendations from "../components/MusicRecommendations";
import { exportResultAsPDF } from "../utils/exportPDF";
import api from "../services/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area, CartesianGrid, ReferenceLine
} from "recharts";

const BAND_COLORS = { delta: "#3b82f6", theta: "#8b5cf6", alpha: "#10b981", beta: "#f59e0b", gamma: "#ef4444" };
const EMOTION_COLORS = { Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444", Calm: "#10b981", Stress: "#8b5cf6" };
const EMOTION_SCORE = { Happy: 5, Calm: 4, Stress: 3, Angry: 2, Sad: 1 };
const SCORE_LABELS = { 5: "Happy", 4: "Calm", 3: "Stress", 2: "Angry", 1: "Sad" };

const BAND_GUIDE = [
    { key: "delta", label: "Delta", range: "0.5 – 4 Hz", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", icon: "🌙", plain: "The slowest brainwaves, dominant during deep, dreamless sleep. High delta in a waking EEG can indicate fatigue, brain fog, or deep relaxation.", emotion: "Associated with: deep rest, unconscious states" },
    { key: "theta", label: "Theta", range: "4 – 8 Hz", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)", icon: "💭", plain: "Present during light sleep, day-dreaming, and deep meditation. Elevated theta is linked to creativity, emotional processing, and sadness or anxiety when excessive.", emotion: "Associated with: drowsiness, meditation, creativity, sadness" },
    { key: "alpha", label: "Alpha", range: "8 – 13 Hz", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: "😌", plain: "The 'relaxed alertness' band — strongest when you close your eyes and unwind. High alpha means you're calm and composed; suppressed alpha often signals stress or intense focus.", emotion: "Associated with: calm, happiness, relaxed focus" },
    { key: "beta", label: "Beta", range: "13 – 30 Hz", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", icon: "⚡", plain: "Active thinking, problem-solving, and alertness live here. Moderate beta is healthy and productive. Very high beta is a strong indicator of stress, anxiety, or anger.", emotion: "Associated with: focus, stress, anger, anxiety" },
    { key: "gamma", label: "Gamma", range: "30 – 100 Hz", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", icon: "🔥", plain: "The fastest band, linked to peak cognitive performance, intense concentration, and binding of sensory information. Elevated gamma can also appear during strong emotional arousal or stress.", emotion: "Associated with: peak focus, high arousal, strong emotion" },
];

const TOOLTIP_STYLE = {
    contentStyle: { background: "rgba(3,15,10,0.96)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 12 },
    labelStyle: { color: "#7fa891" }, itemStyle: { color: "#a7f3d0" },
};

/* ── Brainwave Guide ──────────────────────────────────────────────────────── */
const BrainwaveGuide = () => {
    const [open, setOpen] = useState(false);
    return (
        <div className="glass-card mb-6 overflow-hidden" style={{ border: "1px solid rgba(52,211,153,0.18)" }}>
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
                style={{ background: "rgba(16,185,129,0.04)" }}>
                <div className="flex items-center gap-3">
                    <span className="text-xl">🧬</span>
                    <div>
                        <span className="text-white font-semibold text-base font-['Nunito']">What do these bands mean?</span>
                        <p className="text-xs mt-0.5" style={{ color: "#5a8a72" }}>Plain-language guide to EEG brainwave frequencies</p>
                    </div>
                </div>
                <span className="text-lg font-bold transition-transform duration-300" style={{ color: "#34d399", transform: open ? "rotate(45deg)" : "rotate(0deg)", display: "inline-block" }}>+</span>
            </button>
            <div style={{ maxHeight: open ? "800px" : "0px", overflow: "hidden", transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1)" }}>
                <div className="px-6 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BAND_GUIDE.map((band) => (
                        <div key={band.key} className="rounded-2xl p-4" style={{ background: band.bg, border: `1px solid ${band.border}` }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{band.icon}</span>
                                <div>
                                    <span className="font-bold text-white text-base">{band.label}</span>
                                    <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: band.border, color: band.color }}>{band.range}</span>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed mb-2">{band.plain}</p>
                            <p className="text-xs italic" style={{ color: band.color }}>{band.emotion}</p>
                        </div>
                    ))}
                    <div className="sm:col-span-2 lg:col-span-3 rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
                        <p className="text-xs leading-relaxed" style={{ color: "#6ee7b7" }}>
                            <span className="font-bold">💡 Quick Tip: </span>
                            Healthy emotional balance shows <strong>high Alpha</strong> (calm &amp; relaxed),
                            <strong> moderate Beta</strong> (alert but not stressed), and
                            <strong> low Theta/Delta</strong> during waking hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── SHAP Explainability Chart ────────────────────────────────────────────── */
const ShapExplanation = ({ shapData, emotion }) => {
    if (!shapData || Object.keys(shapData).length === 0) return null;

    // Sort by absolute value, take top 8
    const sorted = Object.entries(shapData)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 8)
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)) }));

    const emotionColor = EMOTION_COLORS[emotion] || "#10b981";

    return (
        <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🔍</span>
                <h2 className="text-lg font-semibold text-white font-['Nunito']">Why did the model decide this?</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: "#5a8a72" }}>
                SHAP values — how much each brainwave feature pushed the prediction toward <strong style={{ color: emotionColor }}>{emotion}</strong>.
                Positive = supporting evidence. Negative = opposing evidence.
            </p>

            <ResponsiveContainer width="100%" height={Math.max(sorted.length * 38, 200)}>
                <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: "#7fa891", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fill: "#a7f3d0", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v.toFixed(4), "SHAP value"]} />
                    <ReferenceLine x={0} stroke="var(--border)" />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {sorted.map((entry) => (
                            <Cell key={entry.name} fill={entry.value >= 0 ? emotionColor : "#ef4444"} fillOpacity={0.85} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="flex gap-4 mt-3 text-xs" style={{ color: "#5a8a72" }}>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: emotionColor }} /> Supports {emotion}
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-red-500" /> Opposes {emotion}
                </span>
            </div>
        </div>
    );
};

/* ── Emotion Timeline Chart ───────────────────────────────────────────────── */
const EmotionTimeline = ({ timeline }) => {
    if (!timeline || timeline.length < 3) return null;

    // Custom Y-axis tick (number → emotion name)
    const YAxisTick = ({ x, y, payload }) => {
        const label = SCORE_LABELS[payload.value] || "";
        const color = EMOTION_COLORS[label] || "#7fa891";
        return <text x={x - 4} y={y + 4} textAnchor="end" fontSize={11} fill={color}>{label}</text>;
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const score = payload[0]?.value;
        const emotion = SCORE_LABELS[score] || "";
        const conf = payload[0]?.payload?.confidence;
        return (
            <div className="rounded-xl px-4 py-3 text-sm shadow-lg" style={{ background: "rgba(3,15,10,0.96)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <div className="font-semibold" style={{ color: EMOTION_COLORS[emotion] || "#34d399" }}>{emotion}</div>
                <div style={{ color: "#7fa891" }}>t = {label}s</div>
                {conf && <div style={{ color: "#5a8a72" }}>Confidence: {Math.round(conf * 100)}%</div>}
            </div>
        );
    };

    // Gradient id per dominant emotion
    const dominantEmotion = timeline.reduce((acc, p) => {
        acc[p.emotion] = (acc[p.emotion] || 0) + 1;
        return acc;
    }, {});
    const topEmotion = Object.entries(dominantEmotion).sort((a, b) => b[1] - a[1])[0]?.[0] || "Calm";
    const areaColor = EMOTION_COLORS[topEmotion] || "#10b981";

    return (
        <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📈</span>
                <h2 className="text-lg font-semibold text-white font-['Nunito']">Emotion Timeline</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: "#5a8a72" }}>
                Emotion detected in every 2-second window across your EEG session ({timeline.length} windows analysed)
            </p>

            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={areaColor} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={areaColor} stopOpacity={0.03} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time_s" tick={{ fill: "#7fa891", fontSize: 11 }} tickFormatter={(v) => `${v}s`} />
                    <YAxis domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={<YAxisTick />} width={58} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="stepAfter" dataKey="score" stroke={areaColor} strokeWidth={2.5}
                        fill="url(#timelineGrad)" dot={false} activeDot={{ r: 5, fill: areaColor }} />
                </AreaChart>
            </ResponsiveContainer>

            {/* Emotion chips summary */}
            <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(dominantEmotion)
                    .sort((a, b) => b[1] - a[1])
                    .map(([em, count]) => (
                        <span key={em} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: `${EMOTION_COLORS[em]}18`, color: EMOTION_COLORS[em], border: `1px solid ${EMOTION_COLORS[em]}44` }}>
                            {em}: {Math.round((count / timeline.length) * 100)}%
                        </span>
                    ))}
            </div>
        </div>
    );
};

/* ── Main Results Page ────────────────────────────────────────────────────── */
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
        <div className="app-shell"><Navbar />
            <div className="app-main flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="flex gap-1 justify-center mb-4">{[...Array(8)].map((_, i) => <span key={i} className="wave-bar" />)}</div>
                    <p style={{ color: "#7fa891" }}>Loading results...</p>
                </div>
            </div>
        </div>
    );

    if (error || !result) return (
        <div className="app-shell"><Navbar />
            <div className="app-main flex flex-col items-center justify-center h-96 text-center">
                <div className="text-5xl mb-4">❌</div>
                <p style={{ color: "#7fa891" }}>{error || "Result not found"}</p>
                <Link to="/dashboard" className="btn-primary mt-4">Back to Dashboard</Link>
            </div>
        </div>
    );

    const bandData = Object.entries(result.bandPowers || {}).map(([band, power]) => ({
        band: band.charAt(0).toUpperCase() + band.slice(1), power: parseFloat(power.toFixed(3)), fill: BAND_COLORS[band],
    }));

    const scoreData = Object.entries(result.emotionScores || {})
        .map(([emotion, score]) => ({ emotion, score: parseFloat((score * 100).toFixed(1)) }))
        .sort((a, b) => b.score - a.score);

    const radarData = Object.entries(result.emotionScores || {}).map(([emotion, score]) => ({
        subject: emotion, A: parseFloat((score * 100).toFixed(1)), fullMark: 100,
    }));

    const confPct = Math.round(result.confidence * 100);

    return (
        <div className="app-shell">
            <Navbar />
            <div className="app-main">
                <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
                        <div>
                            <button onClick={() => navigate(-1)} className="text-sm mb-3 flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "#7fa891" }}>← Back</button>
                            <h1 className="text-3xl font-bold text-white font-['Nunito']">EEG Analysis Results</h1>
                            <p className="mt-1" style={{ color: "#7fa891" }}>{result.filename} · {new Date(result.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => exportResultAsPDF(result)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                                style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export PDF
                            </button>
                            <Link to="/upload" className="btn-secondary text-sm">New Analysis</Link>
                        </div>
                    </div>

                    {/* Primary Result Card */}
                    <div className="glass-card p-8 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="text-center md:text-left">
                                <p className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: "#7fa891" }}>Detected Emotional State</p>
                                <div className="flex items-center gap-4 justify-center md:justify-start mb-4">
                                    <span className="text-7xl">
                                        {result.emotion === "Happy" ? "😊" : result.emotion === "Calm" ? "😌" : result.emotion === "Sad" ? "😢" : result.emotion === "Stress" ? "😰" : "😠"}
                                    </span>
                                    <div>
                                        <h2 className="text-5xl font-black text-white font-['Nunito']">{result.emotion}</h2>
                                        <EmotionBadge emotion={result.emotion} size="md" showIcon={false} />
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: "#7fa891" }}>{result.interpretation}</p>
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-medium uppercase tracking-wider mb-4" style={{ color: "#7fa891" }}>Model Confidence</p>
                                <div className="relative w-40 h-40 mx-auto">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="10" />
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 42}`}
                                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - result.confidence)}`}
                                            style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white font-['Nunito']">{confPct}%</span>
                                        <span className="text-xs" style={{ color: "#5a8a72" }}>confidence</span>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm" style={{ color: "#7fa891" }}>
                                    Model: <span className="font-medium" style={{ color: "#34d399" }}>{result.modelUsed}</span> ·{" "}
                                    Time: <span className="font-medium" style={{ color: "#34d399" }}>{result.processingTime}ms</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Brainwave Guide ──────────────────────────────────────────── */}
                    <BrainwaveGuide />

                    {/* ── NEW: Emotion Timeline ────────────────────────────────────── */}
                    <EmotionTimeline timeline={result.emotionTimeline} />

                    {/* Charts row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-2 font-['Nunito']">EEG Brainwave Band Powers</h2>
                            <p className="text-xs mb-4" style={{ color: "#5a8a72" }}>Power Spectral Density (μV²/Hz) via Welch's method</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={bandData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="band" tick={{ fill: "#7fa891", fontSize: 12 }} />
                                    <YAxis tick={{ fill: "#7fa891", fontSize: 11 }} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} μV²/Hz`, "Power"]} />
                                    <Bar dataKey="power" radius={[6, 6, 0, 0]}>
                                        {bandData.map((entry) => <Cell key={entry.band} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {bandData.map((b) => (
                                    <span key={b.band} className="text-xs flex items-center gap-1" style={{ color: "#7fa891" }}>
                                        <span className="w-2 h-2 rounded-full" style={{ background: b.fill }} /> {b.band}: {b.power}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-2 font-['Nunito']">Emotion Probability Radar</h2>
                            <p className="text-xs mb-4" style={{ color: "#5a8a72" }}>Per-class confidence scores from the classifier</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="var(--border)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#7fa891", fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#5a8a72", fontSize: 9 }} />
                                    <Radar name="Score" dataKey="A" stroke="#10b981" fill="#34d399" fillOpacity={0.22} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Probability"]} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Emotion Score Bars */}
                    <div className="glass-card p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 font-['Nunito']">Per-Emotion Confidence Breakdown</h2>
                        <div className="space-y-3">
                            {scoreData.map(({ emotion, score }) => (
                                <div key={emotion} className="flex items-center gap-4">
                                    <EmotionBadge emotion={emotion} size="sm" />
                                    <div className="flex-1 progress-bar">
                                        <div className="progress-fill" style={{ width: `${score}%`, background: EMOTION_COLORS[emotion] || "#10b981" }} />
                                    </div>
                                    <span className="text-sm font-semibold text-white w-12 text-right">{score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── NEW: SHAP Explanation ────────────────────────────────────── */}
                    <ShapExplanation shapData={result.shapExplanation} emotion={result.emotion} />

                    {/* Clinical Interpretation */}
                    <div className="glass-card p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-3 font-['Nunito']">🧬 Clinical Interpretation</h2>
                        <p className="leading-relaxed" style={{ color: "#a7f3d0" }}>{result.interpretation || "No interpretation available."}</p>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: "Primary Emotion", val: result.emotion },
                                { label: "Model Used", val: result.modelUsed },
                                { label: "Confidence", val: `${confPct}%` },
                                { label: "Processing Time", val: `${result.processingTime}ms` },
                            ].map(({ label, val }) => (
                                <div key={label} className="glass p-3 text-center rounded-xl">
                                    <div className="text-white font-semibold font-['Nunito']">{val}</div>
                                    <div className="text-xs mt-0.5" style={{ color: "#5a8a72" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Music Recommendations */}
                    <MusicRecommendations emotion={result.emotion} />
                </main>
            </div>
        </div>
    );
};

export default Results;
