import { create } from "zustand";
import api from "../services/api";

const useAuthStore = create((set) => ({
    user: null,
    loading: true,

    // Initialize session from localStorage
    initSession: async () => {
        const token = localStorage.getItem("emoharmony_token");
        if (!token) {
            set({ loading: false });
            return;
        }

        try {
            const res = await api.get("/auth/me");
            set({ user: res.data.user });
        } catch (err) {
            localStorage.removeItem("emoharmony_token");
        } finally {
            set({ loading: false });
        }
    },

    login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        const { token, user } = res.data;
        localStorage.setItem("emoharmony_token", token);
        set({ user });
        return user;
    },

    register: async (name, email, password, role = "user") => {
        const res = await api.post("/auth/register", { name, email, password, role });
        const { token, user } = res.data;
        localStorage.setItem("emoharmony_token", token);
        set({ user });
        return user;
    },

    logout: () => {
        localStorage.removeItem("emoharmony_token");
        set({ user: null });
    },

    updateUser: (updatedUser) => {
        set((state) => ({ user: { ...state.user, ...updatedUser } }));
    }
}));

export default useAuthStore;
