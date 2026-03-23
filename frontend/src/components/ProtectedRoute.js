import React from "react";
import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

/**
 * ProtectedRoute - Guards routes for authenticated users (and optionally admin).
 * Redirects to /login if not authenticated, or / if not admin.
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuthStore();

    if (loading) {
        return (
            <div className="min-h-screen bg-neuro flex items-center justify-center">
                <div className="text-center">
                    <div className="flex gap-1 justify-center mb-4">
                        {[...Array(8)].map((_, i) => (
                            <span key={i} className="wave-bar" />
                        ))}
                    </div>
                    <p className="text-slate-400 text-sm">Loading EmoHarmony...</p>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;

    return children;
};

export default ProtectedRoute;
