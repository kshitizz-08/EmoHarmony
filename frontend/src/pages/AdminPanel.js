import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import api from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const EMOTION_COLORS = { Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444", Calm: "#10b981", Stress: "#8b5cf6" };
const TOOLTIP_STYLE = {
    contentStyle: { background: "rgba(10,11,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 },
    labelStyle: { color: "#94a3b8" }, itemStyle: { color: "#e2e8f0" },
};

const AdminPanel = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("overview");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [sRes, uRes, rRes] = await Promise.all([
                    api.get("/admin/stats"),
                    api.get("/admin/users"),
                    api.get("/admin/results"),
                ]);
                setStats(sRes.data);
                setUsers(uRes.data.users || []);
                setResults(rRes.data.results || []);
            } catch (err) {
                console.error("Admin fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const handleToggleUser = async (userId) => {
        try {
            const res = await api.put(`/admin/users/${userId}/toggle`);
            setUsers((prev) => prev.map((u) => (u._id === userId ? res.data.user : u)));
        } catch (err) {
            alert(err.response?.data?.error || "Failed to toggle user");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Delete this user and ALL their data? This is irreversible.")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u._id !== userId));
        } catch (err) {
            alert(err.response?.data?.error || "Delete failed");
        }
    };

    const pieData = stats?.emotionDistribution
        ? Object.entries(stats.emotionDistribution).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
        : [];

    const modelData = stats?.modelUsage
        ? Object.entries(stats.modelUsage).map(([model, count]) => ({ model, count }))
        : [];

    const filteredUsers = users.filter(
        (u) => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const TABS = ["overview", "users", "results"];

    return (
        <div className="min-h-screen bg-neuro">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">🛡️</span>
                        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                    </div>
                    <p className="text-slate-400">Platform management and global analytics</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {TABS.map((t) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tab === t ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}>
                            {t}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex gap-1">{[...Array(8)].map((_, i) => <span key={i} className="wave-bar" />)}</div>
                    </div>
                ) : (
                    <>
                        {/* ── Overview Tab ──────────────────────────────────────────── */}
                        {tab === "overview" && (
                            <div className="space-y-6">
                                {/* KPI Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: "Total Users", val: stats?.totalUsers || 0, icon: "👤", color: "indigo" },
                                        { label: "Total Datasets", val: stats?.totalDatasets || 0, icon: "📂", color: "amber" },
                                        { label: "Total Results", val: stats?.totalResults || 0, icon: "📊", color: "emerald" },
                                        { label: "New This Week", val: stats?.newUsersThisWeek || 0, icon: "🆕", color: "rose" },
                                    ].map(({ label, val, icon, color }) => (
                                        <div key={label} className="glass-card p-5">
                                            <div className="text-2xl mb-2">{icon}</div>
                                            <div className="text-2xl font-bold text-white">{val}</div>
                                            <div className="text-sm text-slate-400 mt-0.5">{label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Emotion Distribution */}
                                    <div className="glass-card p-6">
                                        <h2 className="text-lg font-semibold text-white mb-4">Global Emotion Distribution</h2>
                                        {pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <PieChart>
                                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                                                        {pieData.map((e) => <Cell key={e.name} fill={EMOTION_COLORS[e.name] || "#6366f1"} />)}
                                                    </Pie>
                                                    <Tooltip {...TOOLTIP_STYLE} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {pieData.map((d) => (
                                                <span key={d.name} className="text-xs flex items-center gap-1 text-slate-400">
                                                    <span className="w-2 h-2 rounded-full" style={{ background: EMOTION_COLORS[d.name] }} />{d.name}: {d.value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Model Usage */}
                                    <div className="glass-card p-6">
                                        <h2 className="text-lg font-semibold text-white mb-4">Model Usage</h2>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <BarChart data={modelData}>
                                                <XAxis dataKey="model" tick={{ fill: "#94a3b8", fontSize: 13 }} />
                                                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                                                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} analyses`, "Count"]} />
                                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Avg Confidence */}
                                <div className="glass-card p-6 flex items-center gap-6">
                                    <div>
                                        <div className="text-4xl font-black text-indigo-300">
                                            {Math.round((stats?.averageConfidence || 0) * 100)}%
                                        </div>
                                        <div className="text-slate-400 text-sm">Platform-wide average model confidence</div>
                                    </div>
                                    <div className="flex-1 progress-bar">
                                        <div className="progress-fill" style={{ width: `${Math.round((stats?.averageConfidence || 0) * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Users Tab ─────────────────────────────────────────────── */}
                        {tab === "users" && (
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                                    <input
                                        type="text" placeholder="Search users..." value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="input-field flex-1 text-sm !py-2"
                                    />
                                    <span className="text-slate-500 text-sm shrink-0">{filteredUsers.length} users</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full data-table">
                                        <thead>
                                            <tr>
                                                <th className="text-left">Name</th>
                                                <th className="text-left">Email</th>
                                                <th className="text-left">Role</th>
                                                <th className="text-left">Sessions</th>
                                                <th className="text-left">Status</th>
                                                <th className="text-left">Joined</th>
                                                <th className="text-left">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((u) => (
                                                <tr key={u._id}>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                                                                {u.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-white">{u.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-slate-400">{u.email}</td>
                                                    <td>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${u.role === "admin" ? "text-amber-300 bg-amber-500/10" :
                                                                u.role === "researcher" ? "text-indigo-300 bg-indigo-500/10" :
                                                                    "text-slate-400 bg-white/5"
                                                            }`}>{u.role}</span>
                                                    </td>
                                                    <td className="text-slate-300">{u.totalSessions || 0}</td>
                                                    <td>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "text-emerald-300 bg-emerald-500/10" : "text-rose-300 bg-rose-500/10"}`}>
                                                            {u.isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                    <td className="text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        {u.role !== "admin" && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleToggleUser(u._id)}
                                                                    className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-all">
                                                                    {u.isActive ? "Disable" : "Enable"}
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(u._id)} className="btn-danger text-xs !px-2 !py-1">Delete</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredUsers.length === 0 && (
                                        <div className="text-center text-slate-500 text-sm py-12">No users found</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Results Tab ───────────────────────────────────────────── */}
                        {tab === "results" && (
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 border-b border-white/5">
                                    <h2 className="text-white font-medium">All Platform Results (Latest 50)</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full data-table">
                                        <thead>
                                            <tr>
                                                <th className="text-left">User</th>
                                                <th className="text-left">File</th>
                                                <th className="text-left">Emotion</th>
                                                <th className="text-left">Model</th>
                                                <th className="text-left">Confidence</th>
                                                <th className="text-left">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((r) => (
                                                <tr key={r._id}>
                                                    <td>
                                                        <div className="text-sm text-white">{r.userId?.name || "Unknown"}</div>
                                                        <div className="text-xs text-slate-500">{r.userId?.email}</div>
                                                    </td>
                                                    <td className="text-slate-400 text-sm max-w-[150px] truncate">{r.filename}</td>
                                                    <td><EmotionBadge emotion={r.emotion} size="sm" /></td>
                                                    <td><span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{r.modelUsed}</span></td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 progress-bar w-16">
                                                                <div className="progress-fill" style={{ width: `${Math.round(r.confidence * 100)}%` }} />
                                                            </div>
                                                            <span className="text-xs text-slate-300">{Math.round(r.confidence * 100)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {results.length === 0 && (
                                        <div className="text-center text-slate-500 text-sm py-12">No results yet</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminPanel;
