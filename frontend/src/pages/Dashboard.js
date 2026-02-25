import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import EmotionBadge from "../components/EmotionBadge";
import api from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const EMOTION_COLORS = {
  Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444", Calm: "#10b981", Stress: "#8b5cf6"
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, analyticsRes] = await Promise.all([
          api.get("/results?limit=5"),
          api.get("/results/analytics"),
        ]);
        setResults(resRes.data.results || []);
        setStats({
          total: resRes.data.total,
          avgConfidence: resRes.data.avgConfidence,
          distribution: resRes.data.distribution,
          ...analyticsRes.data,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pieData = stats?.distribution
    ? Object.entries(stats.distribution)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
    : [];

  const dominantEmotion = pieData.reduce((a, b) => (a.value > b.value ? a : b), { name: "—", value: 0 });

  return (
    <div className="min-h-screen bg-neuro">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},{" "}
              <span className="text-indigo-400">{user?.name?.split(" ")[0]}</span> 👋
            </h1>
            <p className="text-slate-400 mt-1">Here's your emotional health overview</p>
          </div>
          <Link to="/upload" className="btn-primary flex items-center gap-2 self-start">
            🧠 New EEG Analysis
          </Link>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon="📊" title="Total Sessions" value={stats?.total || 0} color="indigo" subtitle="All time" />
            <StatCard icon="🎯" title="Avg Confidence" value={`${Math.round((stats?.avgConfidence || 0) * 100)}%`} color="emerald" />
            <StatCard icon="😰" title="Stress Index" value={`${stats?.stressIndex || 0}%`} color="purple"
              subtitle="Last 30 days" trendPositive={false} />
            <StatCard icon="😌" title="Calmness Ratio" value={`${stats?.calmnessRatio || 0}%`} color="amber"
              subtitle="Last 30 days" trendPositive={true} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emotion Distribution Chart */}
          <div className="glass-card p-6 col-span-1">
            <h2 className="text-lg font-semibold text-white mb-4">Emotion Distribution</h2>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={4} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} sessions`, ""]}
                      contentStyle={{ background: "rgba(10,11,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                      labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {pieData.map((d) => (
                    <span key={d.name} className="text-xs flex items-center gap-1 text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ background: EMOTION_COLORS[d.name] }} />
                      {d.name}: {d.value}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500">
                <span className="text-4xl mb-2">📊</span>
                <p className="text-sm">No data yet. Upload your first EEG file!</p>
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="glass-card p-6 col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Sessions</h2>
              <Link to="/analytics" className="text-sm text-cyan-400 hover:text-cyan-300">View All →</Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <span className="text-4xl mb-2">🧠</span>
                <p className="text-sm mb-3">No sessions yet</p>
                <Link to="/upload" className="btn-primary text-sm">Upload EEG Data</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r._id}
                    onClick={() => navigate(`/results/${r._id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/8">
                    <EmotionBadge emotion={r.emotion} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{r.filename || "EEG Session"}</p>
                      <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()} · {r.modelUsed}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-cyan-300">{Math.round(r.confidence * 100)}%</div>
                      <div className="text-xs text-slate-500">conf.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { icon: "⬆️", label: "Upload EEG", to: "/upload" },
            { icon: "📈", label: "Analytics", to: "/analytics" },
            { icon: "🕒", label: "Session History", to: "/analytics" },
            { icon: "👤", label: "My Profile", to: "/profile" },
          ].map((a) => (
            <Link key={a.label} to={a.to} className="glass-card p-4 text-center hover:scale-105 transition-transform">
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="text-sm font-medium text-slate-300">{a.label}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
