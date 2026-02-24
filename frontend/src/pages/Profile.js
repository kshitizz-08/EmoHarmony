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

    // Profile edit state
    const [name, setName] = useState(user?.name || "");
    const [saveMsg, setSaveMsg] = useState("");

    // Password change state
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
            setSaveMsg("Profile updated!");
            setTimeout(() => setSaveMsg(""), 3000);
        } catch (err) {
            setSaveMsg("Update failed");
        }
    };

    const handleChangePassword = async () => {
        setPwError(""); setPwMsg("");
        if (pwForm.newPw !== pwForm.confirm) { setPwError("New passwords do not match"); return; }
        if (pwForm.newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
        try {
            await api.put("/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPw });
            setPwMsg("Password changed successfully!");
            setPwForm({ current: "", newPw: "", confirm: "" });
            setTimeout(() => setPwMsg(""), 3000);
        } catch (err) {
            setPwError(err.response?.data?.error || "Password change failed");
        }
    };

    const handleLogout = () => { logout(); navigate("/"); };

    return (
        <div className="min-h-screen bg-neuro">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-enter">
                {/* Profile Hero */}
                <div className="glass-card p-6 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center text-4xl font-black text-indigo-300 shrink-0">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center sm:text-left flex-1">
                        <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
                        <p className="text-slate-400">{user?.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${user?.role === "admin" ? "text-amber-300 bg-amber-500/10 border-amber-500/30" :
                                    user?.role === "researcher" ? "text-indigo-300 bg-indigo-500/10 border-indigo-500/30" :
                                        "text-slate-400 bg-white/5 border-white/10"
                                }`}>{user?.role}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full text-emerald-300 bg-emerald-500/10 border border-emerald-500/30">
                                Active
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center shrink-0">
                        <div className="glass p-3 rounded-xl">
                            <div className="text-xl font-bold text-white">{total}</div>
                            <div className="text-xs text-slate-500">Sessions</div>
                        </div>
                        <div className="glass p-3 rounded-xl">
                            <div className="text-xl font-bold text-white">{user?.totalSessions || 0}</div>
                            <div className="text-xs text-slate-500">Logins</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {["history", "settings"].map((t) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tab === t ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}>
                            {t === "history" ? "📋 Session History" : "⚙️ Settings"}
                        </button>
                    ))}
                </div>

                {/* ── History Tab ───────────────────────────────────────────────── */}
                {tab === "history" && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-white font-medium">My EEG Sessions</h2>
                            <span className="text-slate-500 text-sm">{total} total</span>
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading...</div>
                        ) : results.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-4xl mb-3">📂</div>
                                <p className="text-slate-400 mb-4">No sessions yet</p>
                                <Link to="/upload" className="btn-primary text-sm">Upload EEG Data</Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full data-table">
                                    <thead>
                                        <tr>
                                            <th className="text-left">File</th>
                                            <th className="text-left">Emotion</th>
                                            <th className="text-left">Model</th>
                                            <th className="text-left">Confidence</th>
                                            <th className="text-left">Date</th>
                                            <th className="text-left">View</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r) => (
                                            <tr key={r._id}>
                                                <td className="text-slate-300 text-sm max-w-[180px] truncate">{r.filename}</td>
                                                <td><EmotionBadge emotion={r.emotion} size="sm" /></td>
                                                <td><span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{r.modelUsed}</span></td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 progress-bar">
                                                            <div className="progress-fill" style={{ width: `${Math.round(r.confidence * 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs text-white">{Math.round(r.confidence * 100)}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <Link to={`/results/${r._id}`} className="text-indigo-400 hover:text-indigo-300 text-xs underline">View →</Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Settings Tab ──────────────────────────────────────────────── */}
                {tab === "settings" && (
                    <div className="space-y-6">
                        {/* Edit Profile */}
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Edit Profile</h2>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Name</label>
                                    <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                    <input type="email" className="input-field opacity-50 cursor-not-allowed" value={user?.email} readOnly />
                                    <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                                </div>
                                {saveMsg && <p className="text-sm text-emerald-400">{saveMsg}</p>}
                                <button onClick={handleSaveProfile} className="btn-primary text-sm">Save Changes</button>
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
                                    <input type="password" className="input-field" placeholder="••••••••"
                                        value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                                    <input type="password" className="input-field" placeholder="Min. 6 characters"
                                        value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                                    <input type="password" className="input-field" placeholder="Repeat new password"
                                        value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                                </div>
                                {pwError && <p className="text-sm text-rose-400">⚠️ {pwError}</p>}
                                {pwMsg && <p className="text-sm text-emerald-400">✅ {pwMsg}</p>}
                                <button onClick={handleChangePassword} className="btn-primary text-sm">Update Password</button>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="glass-card p-6 border border-rose-500/20">
                            <h2 className="text-lg font-semibold text-rose-400 mb-3">⚠️ Danger Zone</h2>
                            <p className="text-slate-400 text-sm mb-4">Sign out of your current session.</p>
                            <button onClick={handleLogout} className="btn-danger">Sign Out</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Profile;
