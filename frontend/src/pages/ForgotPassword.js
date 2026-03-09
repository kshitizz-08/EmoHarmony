/**
 * ForgotPassword — Clean light theme
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");
        try {
            await api.post("/auth/forgot-password", { email });
            setStatus("sent");
        } catch (err) {
            setStatus("error");
            setMessage(err.response?.data?.error || "Something went wrong. Try again.");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 380 }}>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="15" height="15" viewBox="0 0 20 20" fill="white">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>
                            Emo<span style={{ color: "var(--accent)" }}>Harmony</span>
                        </span>
                    </div>
                </div>

                <div className="card" style={{ padding: "24px 26px" }}>
                    {status === "sent" ? (
                        <div style={{ textAlign: "center", padding: "8px 0" }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Check your inbox</h2>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                                If <strong style={{ color: "var(--text-primary)" }}>{email}</strong> is registered, you'll receive a reset link shortly. It expires in 1 hour.
                            </p>
                            <Link to="/login" className="btn-primary" style={{ display: "block", textAlign: "center" }}>Back to sign in</Link>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Forgot password?</h1>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Enter your email and we'll send a reset link.</p>

                            {status === "error" && <div className="alert-error" style={{ marginBottom: 14 }}>⚠️ {message}</div>}

                            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div>
                                    <label className="input-label">Email address</label>
                                    <input type="email" className="input-field" placeholder="you@example.com"
                                        value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}
                                    disabled={status === "loading" || !email}>
                                    {status === "loading" ? "Sending…" : "Send reset link"}
                                </button>
                            </form>

                            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
                                Remembered it?{" "}
                                <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ textAlign: "center", marginTop: 14 }}>
                    <Link to="/" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>← Back to home</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
