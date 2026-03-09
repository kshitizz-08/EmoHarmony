import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmotionBadge from "../components/EmotionBadge";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

const Profile = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("history");
    const [name, setName] = useState(user?.name || "");
    const [saveMsg, setSaveMsg] = useState("");
    const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
    const [pwMsg, setPwMsg] = useState("");
    const [pwError, setPwError] = useState("");

    useEffect(() => {
        api.get("/results?limit=20")
            .then((res) => { setResults(res.data.results || []); setTotal(res.data.total || 0); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSaveProfile = async () => {
        try {
            const res = await api.put("/auth/profile", { name });
            updateUser(res.data.user);
            setSaveMsg("Profile updated!"); setTimeout(() => setSaveMsg(""), 3000);
        } catch { setSaveMsg("Update failed"); }
    };

    const handleChangePassword = async () => {
        setPwError(""); setPwMsg("");
        if (pwForm.newPw !== pwForm.confirm) { setPwError("New passwords do not match"); return; }
        if (pwForm.newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
        try {
            await api.put("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPw });
            setPwMsg("Password changed!"); setPwForm({ current: "", newPw: "", confirm: "" });
            setTimeout(() => setPwMsg(""), 3000);
        } catch (err) { setPwError(err.response?.data?.error || "Password change failed"); }
    };

    const initials = user?.name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "U";

    return (
        <div className="app-shell">
            <Navbar />
            <div className="app-main page-enter">

                {/* Top bar */}
                <div className="app-topbar">
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Profile</span>
                </div>

                <div className="app-content">

                    {/* Profile header card */}
                    <div className="card" style={{ padding: 20, marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--accent-light)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {initials}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{user?.name}</div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{user?.email}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)", textTransform: "capitalize" }}>{user?.role}</span>
                                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>Active</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, textAlign: "center" }}>
                            <div style={{ padding: "12px 20px", background: "var(--bg-subtle)", borderRadius: 8 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{total}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sessions</div>
                            </div>
                            <div style={{ padding: "12px 20px", background: "var(--bg-subtle)", borderRadius: 8 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{user?.totalSessions || 0}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Logins</div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
                        {[["history", "📋 Session History"], ["settings", "⚙️ Settings"]].map(([t, label]) => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "none",
                                border: "none", cursor: "pointer", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                                color: tab === t ? "var(--accent)" : "var(--text-secondary)",
                                marginBottom: -1, transition: "color 0.15s",
                            }}>{label}</button>
                        ))}
                    </div>

                    {/* History */}
                    {tab === "history" && (
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">My EEG Sessions</span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{total} total</span>
                            </div>
                            {loading ? (
                                <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
                            ) : results.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center" }}>
                                    <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>No sessions yet</p>
                                    <Link to="/upload" className="btn-primary" style={{ fontSize: 12 }}>Upload EEG Data</Link>
                                </div>
                            ) : (
                                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "left" }}>File</th>
                                            <th style={{ textAlign: "left" }}>Emotion</th>
                                            <th style={{ textAlign: "left" }}>Model</th>
                                            <th style={{ textAlign: "left" }}>Confidence</th>
                                            <th style={{ textAlign: "left" }}>Date</th>
                                            <th style={{ textAlign: "right" }}>View</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r) => (
                                            <tr key={r._id}>
                                                <td style={{ color: "var(--text-primary)", fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.filename}</td>
                                                <td><EmotionBadge emotion={r.emotion} size="sm" /></td>
                                                <td><span className="tag">{r.modelUsed}</span></td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div className="progress-bar" style={{ width: 56 }}><div className="progress-fill" style={{ width: `${Math.round(r.confidence * 100)}%` }} /></div>
                                                        <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{Math.round(r.confidence * 100)}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                                <td style={{ textAlign: "right" }}><Link to={`/results/${r._id}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>View →</Link></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Settings */}
                    {tab === "settings" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Edit Profile */}
                            <div className="card" style={{ padding: 20 }}>
                                <div className="card-title" style={{ marginBottom: 16 }}>Edit Profile</div>
                                <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div>
                                        <label className="input-label">Display Name</label>
                                        <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="input-label">Email</label>
                                        <input type="email" className="input-field" value={user?.email} readOnly style={{ opacity: 0.6 }} />
                                        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>Email cannot be changed</p>
                                    </div>
                                    {saveMsg && <div className="alert-success">{saveMsg}</div>}
                                    <button onClick={handleSaveProfile} className="btn-primary" style={{ alignSelf: "flex-start" }}>Save changes</button>
                                </div>
                            </div>

                            {/* Change Password */}
                            <div className="card" style={{ padding: 20 }}>
                                <div className="card-title" style={{ marginBottom: 16 }}>Change Password</div>
                                <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
                                    {["Current Password", "New Password", "Confirm New Password"].map((label, i) => (
                                        <div key={i}>
                                            <label className="input-label">{label}</label>
                                            <input type="password" className="input-field" placeholder="••••••••"
                                                value={[pwForm.current, pwForm.newPw, pwForm.confirm][i]}
                                                onChange={(e) => setPwForm({ ...pwForm, [["current", "newPw", "confirm"][i]]: e.target.value })} />
                                        </div>
                                    ))}
                                    {pwError && <div className="alert-error">⚠️ {pwError}</div>}
                                    {pwMsg && <div className="alert-success">✅ {pwMsg}</div>}
                                    <button onClick={handleChangePassword} className="btn-primary" style={{ alignSelf: "flex-start" }}>Update password</button>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="card" style={{ padding: 20, borderColor: "#fecaca" }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>Sign out</div>
                                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Sign out of your current session.</p>
                                <button onClick={() => { logout(); navigate("/"); }} className="btn-danger">Sign out</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
