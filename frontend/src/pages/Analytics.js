import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import api from "../services/api";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const EMOTION_COLORS = { Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444", Calm: "#0d9488", Stress: "#8b5cf6" };

const CHART_TOOLTIP = {
    contentStyle: { background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
    labelStyle: { color: "var(--text-secondary)" }, itemStyle: { color: "var(--text-primary)" },
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
        <div className="app-shell">
            <Navbar />
            <div className="app-main page-enter">

                {/* Top bar */}
                <div className="app-topbar">
                    <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Analytics</span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>· Emotional trends over the last 30 days</span>
                    </div>
                    <Link to="/upload" className="btn-primary">+ New Analysis</Link>
                </div>

                <div className="app-content">

                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading analytics…</div>
                    ) : (
                        <>
                            {/* KPI Row */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                                {[
                                    { label: "Total Sessions", val: data?.total || 0, icon: "📊", bg: "#e0f2fe" },
                                    { label: "Stress Index", val: `${data?.stressIndex || 0}%`, icon: "😰", bg: "#f5f3ff" },
                                    { label: "Calmness Ratio", val: `${data?.calmnessRatio || 0}%`, icon: "😌", bg: "#f0fdfa" },
                                    { label: "Recent Sessions", val: data?.recentSessions?.length || 0, icon: "🕐", bg: "#fffbeb" },
                                ].map(({ label, val, icon, bg }) => (
                                    <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                                        <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 12 }}>{icon}</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 4 }}>{val}</div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                                    </div>
                                ))}

                            </div>

                            {/* Gauges */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                {[
                                    { label: "Stress Index", pct: data?.stressIndex || 0, color: "#8b5cf6", sub: "% of sessions were negative emotion" },
                                    { label: "Calmness Ratio", pct: data?.calmnessRatio || 0, color: "#0d9488", sub: "% of sessions were positive emotion" },
                                ].map(({ label, pct, color, sub }) => (
                                    <div key={label} className="card" style={{ padding: 20 }}>
                                        <div className="card-title" style={{ marginBottom: 16 }}>{label}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                                            <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                                                <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="12" />
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${2 * Math.PI * 40}`}
                                                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`} />
                                                </svg>
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{pct}%</span>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Charts */}
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
                                {/* Weekly trend */}
                                <div className="card">
                                    <div className="card-header"><span className="card-title">Weekly Emotion Trend</span></div>
                                    <div className="card-body">
                                        {weeklyPoints.some(w => w.total > 0) ? (
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={weeklyPoints}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                                                    <Tooltip {...CHART_TOOLTIP} />
                                                    {Object.keys(EMOTION_COLORS).map((e) => (
                                                        <Line key={e} type="monotone" dataKey={e} stroke={EMOTION_COLORS[e]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                                <p style={{ fontSize: 13, marginBottom: 12 }}>No data in the last 30 days.</p>
                                                <Link to="/upload" className="btn-primary" style={{ fontSize: 12 }}>Upload EEG</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Pie */}
                                <div className="card">
                                    <div className="card-header"><span className="card-title">Emotion Distribution</span></div>
                                    <div className="card-body">
                                        {pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={200}>
                                                <PieChart>
                                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} paddingAngle={3} dataKey="value">
                                                        {pieData.map((e) => <Cell key={e.name} fill={EMOTION_COLORS[e.name] || "#6366f1"} />)}
                                                    </Pie>
                                                    <Tooltip {...CHART_TOOLTIP} />
                                                    <Legend iconSize={8} iconType="circle" formatter={(v) => <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>No data yet</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Band powers */}
                            <div className="card" style={{ marginBottom: 16 }}>
                                <div className="card-header">
                                    <span className="card-title">Average Brainwave Band Powers</span>
                                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>μV²/Hz across all sessions</span>
                                </div>
                                <div className="card-body">
                                    {bandAvgData.some((b) => b.power > 0) ? (
                                        <ResponsiveContainer width="100%" height={150}>
                                            <BarChart data={bandAvgData}>
                                                <XAxis dataKey="band" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v} μV²/Hz`, "Avg Power"]} />
                                                <Bar dataKey="power" radius={[5, 5, 0, 0]} fill="#0d9488" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>No data yet</div>
                                    )}
                                </div>
                            </div>

                            {/* Recent sessions */}
                            <div className="card">
                                <div className="card-header"><span className="card-title">Recent Sessions</span></div>
                                {data?.recentSessions?.length > 0 ? (
                                    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr><th style={{ textAlign: "left" }}>Emotion</th><th style={{ textAlign: "left" }}>Date</th><th style={{ textAlign: "left" }}>Model</th><th style={{ textAlign: "right" }}>Confidence</th></tr>
                                        </thead>
                                        <tbody>
                                            {data.recentSessions.map((s, i) => (
                                                <tr key={i}>
                                                    <td><EmotionBadge emotion={s.emotion} size="sm" /></td>
                                                    <td style={{ color: "var(--text-secondary)" }}>{new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                                    <td><span className="tag">{s.model}</span></td>
                                                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent)" }}>{Math.round(s.confidence * 100)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                                        No recent sessions.{" "}
                                        <Link to="/upload" style={{ color: "var(--accent)", textDecoration: "none" }}>Upload EEG data</Link>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
