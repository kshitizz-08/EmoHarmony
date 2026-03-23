import { create } from "zustand";

const getInitialTheme = () => {
    // During SSR or test environments, document might not exist
    if (typeof window === "undefined") return "light";

    const saved = localStorage.getItem("emoharmony_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
};

const useThemeStore = create((set) => ({
    theme: getInitialTheme(),
    toggleTheme: () => set((state) => {
        const newTheme = state.theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("emoharmony_theme", newTheme);
        return { theme: newTheme };
    })
}));

export default useThemeStore;
