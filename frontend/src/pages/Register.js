import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "user" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
        if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
        setLoading(true);
        try {
            await register(form.name, form.email, form.password, form.role);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ width: "100%", maxWidth: 400 }}>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 34, height: 34, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 19, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                            Emo<span style={{ color: "var(--accent)" }}>Harmony</span>
                        </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Create your account</p>
                </div>

                <div className="card" style={{ padding: "24px 26px" }}>
                    <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>Get started</h1>

                    {error && <div className="alert-error" style={{ marginBottom: 14 }}>⚠️ {error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                        <div>
                            <label className="input-label">Full name</label>
                            <input className="input-field" placeholder="John Doe" value={form.name}
                                onChange={e => set("name", e.target.value)} required />
                        </div>

                        <div>
                            <label className="input-label">Email address</label>
                            <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
                                onChange={e => set("email", e.target.value)} required />
                        </div>

                        <div>
                            <label className="input-label">Password</label>
                            <input type="password" className="input-field" placeholder="Min. 6 characters" value={form.password}
                                onChange={e => set("password", e.target.value)} required />
                        </div>

                        <div>
                            <label className="input-label">Confirm password</label>
                            <input type="password" className="input-field" placeholder="Repeat password" value={form.confirm}
                                onChange={e => set("confirm", e.target.value)} required
                                style={{ borderColor: form.confirm && form.confirm !== form.password ? "#fca5a5" : "" }} />
                        </div>

                        <div>
                            <label className="input-label">Account type</label>
                            <select className="input-field" value={form.role} onChange={e => set("role", e.target.value)}>
                                <option value="user">User (student / patient)</option>
                                <option value="researcher">Researcher</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} disabled={loading}>
                            {loading ? "Creating account…" : "Create account"}
                        </button>
                    </form>

                    <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
                        Already have an account?{" "}
                        <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
                    </div>
                </div>

                <div style={{ textAlign: "center", marginTop: 14 }}>
                    <Link to="/" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>← Back to home</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
