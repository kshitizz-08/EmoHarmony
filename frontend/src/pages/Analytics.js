import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import api from "../services/api";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const EMOTION_COLORS = { Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444", Calm: "#10b981", Stress: "#8b5cf6" };
const TOOLTIP_STYLE = {
    contentStyle: { background: "rgba(10,11,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 },
    labelStyle: { color: "#94a3b8" }, itemStyle: { color: "#e2e8f0" },
};

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/results/analytics")
            .then((res) => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-neuro"><Navbar />
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="flex gap-1 justify-center mb-4">{[...Array(8)].map((_, i) => <span key={i} className="wave-bar" />)}</div>
                    <p className="text-slate-400">Loading analytics...</p>
                </div>
            </div>
        </div>
    );

    const pieData = data?.distribution
        ? Object.entries(data.distribution).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
        : [];

    const weeklyPoints = data?.weeklyData
        ? Object.entries(data.weeklyData).map(([day, emotions]) => ({
            day, ...emotions, total: Object.values(emotions).reduce((a, b) => a + b, 0),
        }))
        : [];

    const bandAvgData = data?.bandAverages
        ? Object.entries(data.bandAverages).map(([band, power]) => ({
            band: band.charAt(0).toUpperCase() + band.slice(1), power: parseFloat(power.toFixed(3)),
        }))
        : [];

    return (
        <div className="min-h-screen bg-neuro">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Analytics</h1>
                        <p className="text-slate-400 mt-1">Your emotional trends over the last 30 days</p>
                    </div>
                    <Link to="/upload" className="btn-primary self-start">+ New Analysis</Link>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Total Sessions", val: data?.total || 0, icon: "📊", color: "text-indigo-300" },
                        { label: "Stress Index", val: `${data?.stressIndex || 0}%`, icon: "😰", color: "text-purple-300" },
                        { label: "Calmness Ratio", val: `${data?.calmnessRatio || 0}%`, icon: "😌", color: "text-emerald-300" },
                        { label: "Recent Sessions", val: data?.recentSessions?.length || 0, icon: "🕐", color: "text-amber-300" },
                    ].map(({ label, val, icon, color }) => (
                        <div key={label} className="glass-card p-5">
                            <div className="text-2xl mb-2">{icon}</div>
                            <div className={`text-2xl font-bold ${color}`}>{val}</div>
                            <div className="text-sm text-slate-400 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Stress & Calmness Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {[
                        { label: "Stress Index", pct: data?.stressIndex || 0, color: "#8b5cf6", sub: "% of sessions were negative emotion" },
                        { label: "Calmness Ratio", pct: data?.calmnessRatio || 0, color: "#10b981", sub: "% of sessions were positive emotion" },
                    ].map(({ label, pct, color, sub }) => (
                        <div key={label} className="glass-card p-6">
                            <h3 className="text-white font-semibold mb-4">{label}</h3>
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-24 shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                                        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 40}`}
                                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`} />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-lg font-bold text-white">{pct}%</span>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm">{sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Weekly Emotion Trend */}
                    <div className="glass-card p-6 col-span-1 lg:col-span-2">
                        <h2 className="text-lg font-semibold text-white mb-4">Weekly Emotion Trend</h2>
                        {weeklyPoints.some(w => w.total > 0) ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={weeklyPoints}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    {Object.keys(EMOTION_COLORS).map((e) => (
                                        <Line key={e} type="monotone" dataKey={e} stroke={EMOTION_COLORS[e]}
                                            strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-slate-500">
                                <p className="text-sm">No data in the last 30 days. Upload some EEG files first.</p>
                                <Link to="/upload" className="btn-primary text-sm mt-3">Upload EEG</Link>
                            </div>
                        )}
                    </div>

                    {/* Emotion Distribution Pie */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Emotion Distribution</h2>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                                        {pieData.map((e) => <Cell key={e.name} fill={EMOTION_COLORS[e.name] || "#6366f1"} />)}
                                    </Pie>
                                    <Tooltip {...TOOLTIP_STYLE} />
                                    <Legend iconSize={10} iconType="circle"
                                        formatter={(v) => <span className="text-slate-400 text-xs">{v}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
                        )}
                    </div>
                </div>

                {/* Average Band Powers */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Average Brainwave Band Powers (30 Days)</h2>
                    <p className="text-xs text-slate-500 mb-4">Average μV²/Hz across all sessions in the past month</p>
                    {bandAvgData.some((b) => b.power > 0) ? (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={bandAvgData}>
                                <XAxis dataKey="band" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} μV²/Hz`, "Avg Power"]} />
                                <Bar dataKey="power" radius={[6, 6, 0, 0]} fill="#6366f1" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
                    )}
                </div>

                {/* Recent Sessions Timeline */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent Sessions</h2>
                    {data?.recentSessions?.length > 0 ? (
                        <div className="space-y-3">
                            {data.recentSessions.map((s, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <EmotionBadge emotion={s.emotion} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white">{new Date(s.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-slate-500">Model: {s.model}</div>
                                    </div>
                                    <div className="text-sm font-semibold text-indigo-300">{Math.round(s.confidence * 100)}%</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm text-center py-8">No recent sessions. <Link to="/upload" className="text-indigo-400">Upload EEG data</Link></p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Analytics;
