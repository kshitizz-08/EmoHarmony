import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NeuralNetworkCanvas from "../components/NeuralNetworkCanvas";
import EEGWaveCanvas from "../components/EEGWaveCanvas";
import useCountUp from "../utils/useCountUp";

/**
 * LandingPage — Hero with live neural network background, scrolling EEG wave,
 * and animated counter stats.
 */
const features = [
    { icon: "🧠", title: "EEG Signal Processing", desc: "Advanced Butterworth filtering, artifact removal, and band-power extraction from raw brainwave data." },
    { icon: "🤖", title: "Multi-Model ML Engine", desc: "Select from SVM, CNN, or LSTM models — each tuned for EEG emotion classification tasks." },
    { icon: "📊", title: "Real-time Visualization", desc: "Dynamic band-power charts, emotion probability bars, and brainwave signal plots." },
    { icon: "📈", title: "Longitudinal Analytics", desc: "Track emotional trends, stress index, and calmness ratio across all your sessions." },
    { icon: "📄", title: "PDF Reports", desc: "Export detailed clinical-style reports with emotion results, interpretations, and graphs." },
    { icon: "🩺", title: "Emotional Wellness Insights", desc: "Understand your stress index and calmness ratio with AI-driven mental health guidance." },
];

const steps = [
    { num: "01", title: "Upload EEG Data", desc: "Upload CSV, EDF, or MAT format EEG files from any consumer or research-grade device." },
    { num: "02", title: "Preprocessing Pipeline", desc: "Signals are filtered, artifact-rejected, and normalized using clinical-grade DSP techniques." },
    { num: "03", title: "Feature Extraction", desc: "Alpha, Beta, Gamma, Theta, and Delta band powers extracted via Welch's PSD method." },
    { num: "04", title: "Emotion Prediction", desc: "Your chosen ML model classifies the emotional state with confidence scores." },
    { num: "05", title: "Results & Insights", desc: "View interactive visualizations, download reports, and track your emotional health over time." },
];

/* ── Animated Stat Item (uses CountUp hook) ───────────────────────── */
const StatItem = ({ end, suffix, label }) => {
    const [val, ref] = useCountUp(end, 1400, suffix);
    return (
        <div ref={ref} className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#67e8f9" }}>{val}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
    );
};

const LandingPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neuro text-white overflow-x-hidden">

            {/* ── Navbar ─────────────────────────────────────── */}
            <header className="glass-dark border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-0.5 items-end h-6">
                            {[6, 12, 18, 14, 8, 22, 16, 10].map((h, i) => (
                                <div key={i} className="wave-bar" style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <span className="text-xl font-bold">
                            <span className="text-white">Emo</span>
                            <span style={{ color: "#22d3ee" }}>Harmony</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <button onClick={() => navigate("/dashboard")} className="btn-primary text-sm">Go to Dashboard</button>
                        ) : (
                            <>
                                <Link to="/login" className="btn-secondary text-sm">Login</Link>
                                <Link to="/register" className="btn-primary text-sm">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Hero ───────────────────────────────────────── */}
            <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">

                {/* 🌐 Neural Network animated canvas */}
                <NeuralNetworkCanvas />

                {/* Layered glows on top of the canvas */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)" }} />
                    <div className="absolute top-10   left-10  w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)" }} />
                    <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)" }} />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto page-enter w-full">

                    {/* 🩺 BCI badge */}
                    <div className="health-badge mb-6">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        Brain-Computer Interface Platform
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight">
                        <span className="text-white">Emotion Recognition</span>
                        <br />
                        <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                            via EEG Brainwaves
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Upload EEG data → Preprocess with clinical DSP → Extract brainwave features →
                        Detect emotions using AI. A final-year BCI engineering project.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        <Link to="/register" className="btn-primary text-base px-8 py-4">🧠 Start Analyzing EEG</Link>
                        <Link to="/login" className="btn-secondary text-base px-8 py-4">Sign In</Link>
                    </div>

                    {/* 🌊 Live EEG Wave */}
                    <div className="w-full max-w-3xl mx-auto mb-10 rounded-2xl overflow-hidden"
                        style={{ border: "1px solid rgba(6,182,212,0.18)", background: "rgba(4,13,26,0.55)", backdropFilter: "blur(12px)" }}>
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase">Live EEG Monitor</span>
                            <span className="ml-auto text-xs text-slate-600 font-mono">128 Hz · 4-channel</span>
                        </div>
                        <EEGWaveCanvas height={110} />
                    </div>

                    {/* 🔢 Animated Stats */}
                    <div className="flex flex-wrap justify-center gap-10">
                        <StatItem end={5} suffix="" label="Emotion Classes" />
                        <StatItem end={3} suffix="" label="ML Models" />
                        <StatItem end={5} suffix="" label="EEG Bands" />
                        <StatItem end={128} suffix="Hz" label="Sampling Rate" />
                    </div>
                </div>
            </section>

            {/* ── Features ───────────────────────────────────── */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Platform Features</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">Academic-grade EEG analysis tools wrapped in a modern, intuitive interface.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div key={f.title} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                            <div className="text-4xl mb-4">{f.icon}</div>
                            <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ────────────────────────────────── */}
            <section className="py-24 px-6" style={{ background: "rgba(6,182,212,0.025)" }}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-slate-400">The complete EEG emotion detection pipeline</p>
                    </div>
                    <div className="space-y-6">
                        {steps.map((step) => (
                            <div key={step.num} className="glass-card p-6 flex gap-6 items-start">
                                <div className="text-3xl font-black font-mono w-12 shrink-0" style={{ color: "rgba(6,182,212,0.35)" }}>{step.num}</div>
                                <div>
                                    <h3 className="text-white font-semibold text-lg mb-1">{step.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Emotion Classes ─────────────────────────────── */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-white mb-4">Detectable Emotions</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    {[
                        { e: "Happy", icon: "😊", desc: "Elevated alpha, balanced beta", color: "border-amber-500/30  text-amber-300  bg-amber-500/5" },
                        { e: "Calm", icon: "😌", desc: "High alpha, low beta", color: "border-emerald-500/30 text-emerald-300 bg-emerald-500/5" },
                        { e: "Sad", icon: "😢", desc: "High theta, reduced alpha/beta", color: "border-blue-500/30   text-blue-300   bg-blue-500/5" },
                        { e: "Stress", icon: "😰", desc: "Elevated beta and gamma", color: "border-purple-500/30 text-purple-300 bg-purple-500/5" },
                        { e: "Angry", icon: "😠", desc: "High beta, suppressed alpha", color: "border-red-500/30    text-red-300    bg-red-500/5" },
                    ].map(({ e, icon, desc, color }) => (
                        <div key={e} className={`glass-card border ${color} p-6 text-center w-40`}>
                            <div className="text-4xl mb-3">{icon}</div>
                            <div className="font-bold text-white text-lg">{e}</div>
                            <div className="text-xs text-slate-500 mt-1 leading-tight">{desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────── */}
            <section className="py-24 px-6 text-center">
                <div className="max-w-2xl mx-auto glass-card p-12">
                    <div className="text-5xl mb-4">🧠</div>
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Analyze Brainwaves?</h2>
                    <p className="text-slate-400 mb-8">Create your free account and start uploading EEG data today.</p>
                    <Link to="/register" className="btn-primary text-lg px-10 py-4 inline-block">Get Started Free</Link>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────── */}
            <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-500 text-sm">
                <p>EmoHarmony © {new Date().getFullYear()} · EEG-based Emotion Recognition BCI Platform</p>
            </footer>
        </div>
    );
};

export default LandingPage;
