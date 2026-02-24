import axios from "axios";

/**
 * Preconfigured Axios instance for EmoHarmony API.
 * - Base URL points to Node.js backend
 * - Automatically reads Authorization header from localStorage
 * - Response interceptor handles 401 (token expired) globally
 */
const api = axios.create({
    baseURL: import.meta.env.DEV
        ? "http://localhost:5000/api"
        : `${import.meta.env.VITE_API_URL}/api`,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach stored JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("emoharmony_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle auth errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear and redirect to login
            localStorage.removeItem("emoharmony_token");
            delete api.defaults.headers.common["Authorization"];
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
