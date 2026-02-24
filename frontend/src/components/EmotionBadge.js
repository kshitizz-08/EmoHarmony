import React from "react";

const EMOTION_CONFIG = {
    Happy: { color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30", icon: "😊", dot: "bg-amber-400" },
    Sad: { color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30", icon: "😢", dot: "bg-blue-400" },
    Angry: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", icon: "😠", dot: "bg-red-400" },
    Calm: { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", icon: "😌", dot: "bg-emerald-400" },
    Stress: { color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30", icon: "😰", dot: "bg-purple-400" },
};

/**
 * EmotionBadge - Color-coded pill displaying an emotion label with icon.
 * Supports 'sm', 'md', and 'lg' sizes.
 */
const EmotionBadge = ({ emotion, size = "md", showIcon = true }) => {
    const cfg = EMOTION_CONFIG[emotion] || {
        color: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/30", icon: "🧠", dot: "bg-slate-400"
    };

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5 gap-1",
        md: "text-sm px-3 py-1 gap-1.5",
        lg: "text-base px-4 py-2 gap-2 font-semibold",
    };

    return (
        <span className={`inline-flex items-center rounded-full border font-medium ${cfg.color} ${cfg.bg} ${cfg.border} ${sizeClasses[size]}`}>
            {showIcon && <span>{cfg.icon}</span>}
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {emotion}
        </span>
    );
};

export { EMOTION_CONFIG };
export default EmotionBadge;
