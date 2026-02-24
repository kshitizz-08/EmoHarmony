import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const token = localStorage.getItem("emoharmony_token");
        if (!token) { setLoading(false); return; }

        api.get("/auth/me")
            .then((res) => setUser(res.data.user))
            .catch(() => localStorage.removeItem("emoharmony_token"))
            .finally(() => setLoading(false));
    }, []);

    /** Login: store token, set user */
    const login = async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        const { token, user } = res.data;
        localStorage.setItem("emoharmony_token", token);
        setUser(user);
        return user;
    };

    /** Register: store token, set user */
    const register = async (name, email, password, role = "user") => {
        const res = await api.post("/auth/register", { name, email, password, role });
        const { token, user } = res.data;
        localStorage.setItem("emoharmony_token", token);
        setUser(user);
        return user;
    };

    /** Logout: clear token, clear user */
    const logout = () => {
        localStorage.removeItem("emoharmony_token");
        setUser(null);
    };

    /** Update local user state after profile edit */
    const updateUser = (updatedUser) => {
        setUser((prev) => ({ ...prev, ...updatedUser }));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};

export default AuthContext;
