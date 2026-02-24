import React from "react";

/**
 * StatCard - Glassmorphism analytics card with icon, title, value, and trend.
 */
const StatCard = ({ icon, title, value, trend, trendPositive, subtitle, color = "indigo" }) => {
    const colorMap = {
        indigo: { bg: "bg-indigo-500/10", icon: "text-indigo-400", border: "border-indigo-500/20" },
        amber: { bg: "bg-amber-500/10", icon: "text-amber-400", border: "border-amber-500/20" },
        emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-400", border: "border-emerald-500/20" },
        rose: { bg: "bg-rose-500/10", icon: "text-rose-400", border: "border-rose-500/20" },
        purple: { bg: "bg-purple-500/10", icon: "text-purple-400", border: "border-purple-500/20" },
    };
    const c = colorMap[color] || colorMap.indigo;

    return (
        <div className="glass-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                    <span className={`text-xl ${c.icon}`}>{icon}</span>
                </div>
                {trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendPositive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                        }`}>
                        {trendPositive ? "▲" : "▼"} {trend}
                    </span>
                )}
            </div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-sm font-medium text-slate-300 mt-0.5">{title}</div>
                {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
            </div>
        </div>
    );
};

export default StatCard;
