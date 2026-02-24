import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "user" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirm) {
            setError("Passwords do not match");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        try {
            await register(form.name, form.email, form.password, form.role);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neuro flex items-center justify-center px-4 py-12">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
            </div>

            <div className="w-full max-w-md relative z-10 page-enter">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center gap-0.5 items-end h-12 mb-3">
                        {[8, 14, 20, 16, 10, 24, 18, 12, 20, 16].map((h, i) => (
                            <div key={i} className="wave-bar" style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }} />
                        ))}
                    </div>
                    <h1 className="text-3xl font-bold"><span className="text-white">Emo</span><span className="text-indigo-400">Harmony</span></h1>
                    <p className="text-slate-500 text-sm mt-1">Create your account</p>
                </div>

                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-white mb-1">Get Started</h2>
                    <p className="text-slate-400 text-sm mb-6">Create your EmoHarmony account</p>

                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                            <input type="text" className="input-field" placeholder="Dr. Jane Smith"
                                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input type="email" className="input-field" placeholder="you@example.com"
                                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <option value="user">General User</option>
                                <option value="researcher">Researcher</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <input type="password" className="input-field" placeholder="Min. 6 characters"
                                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                            <input type="password" className="input-field" placeholder="Repeat password"
                                value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full mt-2 flex items-center justify-center gap-2">
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
                            ) : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-500">Already have an account? </span>
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
