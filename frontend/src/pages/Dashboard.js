import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import api from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const EMOTION_COLORS = {
  Happy: "#f59e0b", Sad: "#3b82f6", Angry: "#ef4444",
  Calm: "#0d9488", Stress: "#8b5cf6"
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, analyticsRes] = await Promise.all([
          api.get("/results?limit=6"),
          api.get("/results/analytics"),
        ]);
        setResults(resRes.data.results || []);
        setStats({ total: resRes.data.total, avgConfidence: resRes.data.avgConfidence, distribution: resRes.data.distribution, ...analyticsRes.data });
      } catch (err) {
        console.error("Dashboard:", err);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const pieData = stats?.distribution
    ? Object.entries(stats.distribution).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-main page-enter">

        {/* ── Top bar ── */}
        <div className="app-topbar">
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{greeting}, {user?.name?.split(" ")[0]}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>· EEG Dashboard</span>
          </div>
          <Link to="/upload" className="btn-primary" id="analyze-button">
            + New Analysis
          </Link>
        </div>

        <div className="app-content">

          {/* ── Stat cards ── */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card" style={{ height: 88, background: "var(--bg-subtle)", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Sessions", value: stats?.total || 0, icon: "📊", bg: "#e0f2fe" },
                { label: "Avg Confidence", value: `${Math.round((stats?.avgConfidence || 0) * 100)}%`, icon: "🎯", bg: "#f0fdf4" },
                { label: "Stress Index", value: `${stats?.stressIndex || 0}%`, icon: "📈", bg: "#fef3c7" },
                { label: "Calmness Ratio", value: `${stats?.calmnessRatio || 0}%`, icon: "😌", bg: "#f0fdfa" },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}

            </div>
          )}

          {/* ── Main grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>

            {/* Emotion distribution */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Emotion Distribution</span>
              </div>
              <div className="card-body">
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || "#0d9488"} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [`${v} sessions`, ""]}
                          contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {pieData.map((d) => (
                        <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-secondary)" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: EMOTION_COLORS[d.name], display: "inline-block" }} />
                          {d.name}: {d.value}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
                    <p style={{ fontSize: 13 }}>No data yet</p>
                    <Link to="/upload" className="btn-primary" style={{ marginTop: 12, fontSize: 12 }}>Upload EEG</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent sessions */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Sessions</span>
                <Link to="/analytics" style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
              </div>
              <div style={{ padding: "0 4px" }}>
                {loading ? (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{ height: 40, borderRadius: 6, background: "var(--bg-subtle)", animation: "pulse 1.5s infinite" }} />
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>No sessions yet</p>
                    <Link to="/upload" className="btn-primary" style={{ fontSize: 12 }}>Upload EEG Data</Link>
                  </div>
                ) : (
                  <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Emotion</th>
                        <th style={{ textAlign: "left" }}>File</th>
                        <th style={{ textAlign: "left" }}>Model</th>
                        <th style={{ textAlign: "left" }}>Date</th>
                        <th style={{ textAlign: "right" }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r._id} onClick={() => navigate(`/results/${r._id}`)}
                          style={{ cursor: "pointer" }}>
                          <td><EmotionBadge emotion={r.emotion} size="sm" /></td>
                          <td style={{ color: "var(--text-primary)", fontWeight: 500, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.filename || "EEG Session"}</td>
                          <td><span className="tag">{r.modelUsed}</span></td>
                          <td style={{ color: "var(--text-muted)" }}>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent)" }}>{Math.round(r.confidence * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { icon: "⬆️", label: "Upload EEG", to: "/upload", desc: "Analyze a new file" },
              { icon: "📈", label: "Analytics", to: "/analytics", desc: "View trends over time" },
              { icon: "🕒", label: "History", to: "/analytics", desc: "Past sessions" },
              { icon: "👤", label: "Profile", to: "/profile", desc: "Account settings" },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="card card-hover"
                style={{ padding: 16, textDecoration: "none", display: "block", transition: "box-shadow 0.15s" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.desc}</div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
