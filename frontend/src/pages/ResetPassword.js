/**
 * ResetPassword — Clean light theme
 */
import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");
    const [showPw, setShowPw] = useState(false);

    const strength = password.length >= 8 ? (/[A-Z]/.test(password) && /[0-9]/.test(password) ? "strong" : "medium") : password.length > 0 ? "weak" : "";
    const strengthColor = { strong: "var(--success, #16a34a)", medium: "#d97706", weak: "#dc2626" }[strength] || "transparent";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) { setStatus("error"); setMessage("Passwords don't match."); return; }
        if (password.length < 6) { setStatus("error"); setMessage("Password must be at least 6 characters."); return; }
        setStatus("loading");
        try {
            await api.post(`/auth/reset-password/${token}`, { password });
            setStatus("done");
        } catch (err) {
            setStatus("error");
            setMessage(err.response?.data?.error || "Reset link is invalid or expired.");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 380 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.4px" }}>
                        Emo<span style={{ color: "var(--accent)" }}>Harmony</span>
                    </span>
                </div>

                <div className="card" style={{ padding: "24px 26px" }}>
                    {status === "done" ? (
                        <div style={{ textAlign: "center", padding: "8px 0" }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Password updated!</h2>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Your password has been changed. You can now sign in.</p>
                            <Link to="/login" className="btn-primary" style={{ display: "block", textAlign: "center" }}>Go to sign in</Link>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Create new password</h1>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Enter and confirm your new password.</p>

                            {status === "error" && <div className="alert-error" style={{ marginBottom: 14 }}>⚠️ {message}</div>}

                            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <label className="input-label" style={{ marginBottom: 0 }}>New password</label>
                                        <button type="button" onClick={() => setShowPw(p => !p)}
                                            style={{ background: "none", border: "none", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
                                            {showPw ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    <input type={showPw ? "text" : "password"} className="input-field" placeholder="Min. 6 characters"
                                        value={password} onChange={e => setPassword(e.target.value)} required />
                                    {strength && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                            <div style={{ flex: 1, height: 3, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                                                <div style={{ height: "100%", borderRadius: 999, background: strengthColor, transition: "width 0.3s", width: strength === "strong" ? "100%" : strength === "medium" ? "66%" : "33%" }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: strengthColor, textTransform: "capitalize" }}>{strength}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="input-label">Confirm password</label>
                                    <input type={showPw ? "text" : "password"} className="input-field" placeholder="Repeat password"
                                        value={confirm} onChange={e => setConfirm(e.target.value)} required
                                        style={{ borderColor: confirm && confirm !== password ? "#fca5a5" : "" }} />
                                    {confirm && confirm !== password && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>Passwords don't match</p>}
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}
                                    disabled={status === "loading" || !password || password !== confirm}>
                                    {status === "loading" ? "Saving…" : "Set new password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
