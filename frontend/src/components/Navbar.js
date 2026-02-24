import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const EMOTION_ICONS = { Happy: "😊", Sad: "😢", Angry: "😠", Calm: "😌", Stress: "😰" };

/**
 * Navbar - Top navigation bar with logo, nav links, and user controls.
 */
const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const navLinks = [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/upload", label: "Analyze EEG" },
        { to: "/analytics", label: "Analytics" },
        { to: "/repository", label: "Datasets" },
    ];

    if (!user) return null;

    return (
        <nav className="glass-dark border-b border-white/5 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-3">
                        <div className="flex gap-0.5 items-end h-7">
                            {[8, 14, 20, 16, 10, 24, 18, 12].map((h, i) => (
                                <div key={i} className="wave-bar" style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <div>
                            <span className="text-lg font-bold text-white">Emo</span>
                            <span className="text-lg font-bold text-indigo-400">Harmony</span>
                            <div className="text-xs text-slate-500 -mt-1 leading-none">EEG Emotion AI</div>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === link.to
                                        ? "text-indigo-400 bg-indigo-500/10"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {user.role === "admin" && (
                            <Link
                                to="/admin"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === "/admin"
                                        ? "text-amber-400 bg-amber-500/10"
                                        : "text-slate-400 hover:text-amber-400 hover:bg-amber-500/5"
                                    }`}
                            >
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* User Controls */}
                    <div className="flex items-center gap-3">
                        <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-sm font-bold text-indigo-300">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="hidden sm:block text-left">
                                <div className="text-sm font-medium text-white leading-none">{user.name}</div>
                                <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                            </div>
                        </Link>
                        <button onClick={handleLogout} className="btn-secondary text-sm !px-4 !py-2">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
