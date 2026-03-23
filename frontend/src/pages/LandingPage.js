import React from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const features = [
    { icon: "🧠", title: "EEG Signal Processing", desc: "Butterworth filtering, artifact removal, and band-power extraction from raw brainwave data." },
    { icon: "🤖", title: "Multi-Model ML Engine", desc: "SVM, XGBoost, LightGBM, Bi-LSTM and Ensemble — each tuned for EEG emotion classification." },
    { icon: "📊", title: "Interactive Visualizations", desc: "Band-power charts, emotion probability scores, SHAP explainability, and session timelines." },
    { icon: "📈", title: "Longitudinal Analytics", desc: "Track emotional trends, stress index, and calmness ratio across all your sessions over time." },
    { icon: "📄", title: "PDF Reports", desc: "Export clinical-style reports with emotion results, SHAP charts, and band power tables." },
    { icon: "🎵", title: "Music Recommendations", desc: "Mood-matched music and breathing exercises to help regulate your emotional state." },
];

const steps = [
    { num: "01", title: "Upload EEG Data", desc: "Upload CSV or EDF files from any consumer or research-grade EEG device." },
    { num: "02", title: "Preprocessing", desc: "Signals filtered, artifact-rejected, and normalized using clinical-grade DSP techniques." },
    { num: "03", title: "Feature Extraction", desc: "Alpha, Beta, Gamma, Theta, Delta band powers extracted via Welch's PSD method." },
    { num: "04", title: "Emotion Prediction", desc: "Your chosen ML model classifies the emotional state with confidence scores." },
    { num: "05", title: "Results & Insights", desc: "View visualizations, download reports, and track emotional health over time." },
];

const LandingPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "Inter, sans-serif" }}>

            {/* ── Header ── */}
            <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px" }}>
                            Emo<span style={{ color: "var(--accent)" }}>Harmony</span>
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {user ? (
                            <button onClick={() => navigate("/dashboard")} className="btn-primary">Dashboard</button>
                        ) : (
                            <>
                                <Link to="/login" className="btn-secondary" style={{ fontSize: 13 }}>Sign in</Link>
                                <Link to="/register" className="btn-primary" style={{ fontSize: 13 }}>Get started</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Hero ── */}
            <section style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
                <span style={{ display: "inline-block", background: "var(--accent-light)", color: "var(--accent-dark)", border: "1px solid var(--accent-border)", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
                    EEG-Based Emotion Recognition · Final Year Project
                </span>
                <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-1px", color: "var(--text-primary)", marginBottom: 18 }}>
                    Understand your emotions<br />through brainwave data
                </h1>
                <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 32px" }}>
                    EmoHarmony analyzes your EEG signals using machine learning to detect emotions in real time —
                    helping you track mental wellness, stress patterns, and emotional health.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <Link to={user ? "/upload" : "/register"} className="btn-primary" style={{ fontSize: 14, padding: "10px 22px" }}>
                        Start Analyzing EEG →
                    </Link>
                    <Link to="/login" className="btn-secondary" style={{ fontSize: 14, padding: "10px 22px" }}>
                        Sign in
                    </Link>
                </div>

                {/* Mini stats */}
                <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 52, paddingTop: 40, borderTop: "1px solid var(--border)" }}>
                    {[
                        { val: "94.45%", label: "SVM Accuracy" },
                        { val: "5", label: "Emotion Classes" },
                        { val: "6", label: "ML Models" },
                        { val: "Real-time", label: "Processing" },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{s.val}</div>
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ background: "var(--bg-page)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "60px 24px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Everything you need</h2>
                    <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 40 }}>Built for research, designed for real use.</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {features.map((f) => (
                            <div key={f.title} className="card" style={{ padding: 20 }}>
                                <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>{f.title}</div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section style={{ maxWidth: 820, margin: "0 auto", padding: "60px 24px" }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>How it works</h2>
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 40 }}>Five simple steps from EEG upload to emotion insight.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {steps.map((s, i) => (
                        <div key={s.num} style={{ display: "flex", gap: 20, paddingBottom: i < steps.length - 1 ? 24 : 0 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-light)", border: "1px solid var(--accent-border)", color: "var(--accent)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.num}</div>
                                {i < steps.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", margin: "6px 0" }} />}
                            </div>
                            <div style={{ paddingTop: 8, paddingBottom: 8 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{s.title}</div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ background: "var(--bg-page)", borderTop: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Ready to analyze your EEG?</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
                    Create a free account and upload your first EEG file in minutes.
                </p>
                <Link to={user ? "/upload" : "/register"} className="btn-primary" style={{ fontSize: 14, padding: "10px 24px" }}>
                    {user ? "Upload EEG →" : "Get started for free →"}
                </Link>
            </section>

            {/* ── Footer ── */}
            <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 24px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    © 2025 EmoHarmony · EEG Emotion Recognition Final Year Project ·{" "}
                    <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>Sign in</Link>
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
