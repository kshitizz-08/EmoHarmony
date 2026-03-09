/**
 * EmoHarmony - Clean Sidebar Navigation
 * Replaces the old dark top Navbar with a simple left sidebar.
 */
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

// Simple SVG icons (inline, no extra packages)
const Icons = {
    grid: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>,
    upload: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>,
    chart: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>,
    user: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>,
    shield: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
    logout: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>,
    brain: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>,
};

const NAV_LINKS = [
    { to: "/dashboard", label: "Dashboard", icon: Icons.grid, id: "nav-dashboard" },
    { to: "/upload", label: "Analyze EEG", icon: Icons.upload, id: "upload-nav-link" },
    { to: "/analytics", label: "Analytics", icon: Icons.chart },
    { to: "/profile", label: "Profile", icon: Icons.user },
];

const Navbar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogoutConfirm = () => { logout(); navigate("/"); };

    if (!user) return null;

    const isActive = (to) => location.pathname === to;
    const initials = user.name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "U";

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <aside className="app-sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                    </div>
                    <div>
                        <div className="sidebar-logo-text">Emo<span>Harmony</span></div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>EEG Emotion AI</div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Menu</div>
                    {NAV_LINKS.map(link => (
                        <Link
                            key={link.to}
                            id={link.id}
                            to={link.to}
                            className={`sidebar-link ${isActive(link.to) ? "active" : ""}`}
                        >
                            <span className="icon" style={{ width: 16, height: 16 }}>{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}

                    {user.role === "admin" && (
                        <>
                            <div className="sidebar-section-label">Admin</div>
                            <Link to="/admin" className={`sidebar-link ${isActive("/admin") ? "active" : ""}`}>
                                <span className="icon" style={{ width: 16, height: 16 }}>{Icons.shield}</span>
                                Admin Panel
                            </Link>
                        </>
                    )}
                </nav>

                {/* Footer: User + Logout */}
                <div className="sidebar-footer">
                    <Link to="/profile" style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 7, cursor: "pointer", transition: "background 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <div style={{
                                width: 30, height: 30, borderRadius: "50%",
                                background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                                color: "var(--accent)", fontSize: 12, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                            }}>{initials}</div>
                            <div style={{ overflow: "hidden", flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{user.role}</div>
                            </div>
                        </div>
                    </Link>
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: "8px 10px", borderRadius: 7,
                            background: "none", border: "none", cursor: "pointer",
                            marginBottom: 4, transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                        <span style={{ width: 16, height: 16, opacity: 0.75, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                            {theme === "dark" ? "☀️" : "🌙"}
                        </span>
                        <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </span>
                    </button>
                    <button onClick={() => setShowLogoutModal(true)} className="sidebar-link" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}>
                        <span className="icon" style={{ width: 16, height: 16, color: "var(--text-muted)" }}>{Icons.logout}</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Sign out</span>
                    </button>
                </div>
            </aside>

            {/* ── Mobile top bar (only shows on small screens) ── */}
            <div style={{
                display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 52,
                background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
                alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 50,
            }} className="mobile-topbar">
                <span style={{ fontWeight: 700, fontSize: 16 }}>Emo<span style={{ color: "var(--accent)" }}>Harmony</span></span>
                <button onClick={() => setMobileOpen(o => !o)}
                    style={{ padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer" }}>☰</button>
            </div>
            {/* ── Logout Confirmation Modal ── */}
            {showLogoutModal && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backdropFilter: "blur(3px)",
                }} onClick={() => setShowLogoutModal(false)}>
                    <div style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 14,
                        padding: "28px 32px",
                        width: 320,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                        textAlign: "center",
                    }} onClick={e => e.stopPropagation()}>
                        {/* Icon */}
                        <div style={{
                            width: 48, height: 48, borderRadius: "50%",
                            background: "#fef2f2", border: "1px solid #fecaca",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 14px", fontSize: 22,
                        }}>🚪</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Sign out?</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 22 }}>
                            You'll need to log in again to access your account.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                style={{
                                    flex: 1, padding: "8px 0", borderRadius: 8,
                                    border: "1px solid var(--border)", background: "var(--bg-subtle)",
                                    color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                                }}
                            >Cancel</button>
                            <button
                                onClick={handleLogoutConfirm}
                                style={{
                                    flex: 1, padding: "8px 0", borderRadius: 8,
                                    border: "1px solid #fecaca", background: "#dc2626",
                                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                                }}
                            >Sign out</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
