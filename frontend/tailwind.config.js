/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Neuro dark palette
                "neuro-dark": "#0a0b1e",
                "neuro-blue": "#1a1f5e",
                "neuro-purple": "#2d1b69",
                primary: "#6366f1",
                // Emotion colours
                "emotion-happy": "#f59e0b",
                "emotion-sad": "#3b82f6",
                "emotion-angry": "#ef4444",
                "emotion-calm": "#10b981",
                "emotion-stress": "#8b5cf6",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            boxShadow: {
                glass: "0 8px 32px rgba(99,102,241,0.15)",
                glow: "0 0 30px rgba(99,102,241,0.4)",
                card: "0 4px 24px rgba(0,0,0,0.4)",
            },
            backgroundImage: {
                neuro: "linear-gradient(135deg, #0a0b1e 0%, #1a1f5e 50%, #2d1b69 100%)",
            },
            animation: {
                wave: "wave 1.2s ease-in-out infinite",
                "fade-up": "fadeUp 0.4s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
            },
            keyframes: {
                wave: {
                    "0%, 100%": { transform: "scaleY(1)" },
                    "50%": { transform: "scaleY(0.3)" },
                },
                fadeUp: {
                    from: { opacity: "0", transform: "translateY(16px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
}
