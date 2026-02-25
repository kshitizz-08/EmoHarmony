import React, { useState } from "react";

const MUSIC_DATA = {
    Happy: {
        color: "#f59e0b",
        gradient: "from-yellow-500/20 to-orange-500/10",
        border: "border-yellow-500/30",
        emoji: "🎉",
        mood: "Upbeat & Joyful",
        description: "Boost your happy energy with feel-good tracks",
        spotifyId: "37i9dQZF1DXdPec7aLTmlC",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLDIoUOhQQPlXr63I_vwF9GD8sAKh77dWU",
        songs: [
            { title: "Happy", artist: "Pharrell Williams", youtube: "https://www.youtube.com/watch?v=y6Sxv-sUYtM" },
            { title: "Can't Stop the Feeling", artist: "Justin Timberlake", youtube: "https://www.youtube.com/watch?v=ru0K8uYEZWw" },
            { title: "Uptown Funk", artist: "Bruno Mars", youtube: "https://www.youtube.com/watch?v=OPf0YbXqDm0" },
            { title: "Good as Hell", artist: "Lizzo", youtube: "https://www.youtube.com/watch?v=SmbmeOgWsqE" },
        ],
    },
    Calm: {
        color: "#10b981",
        gradient: "from-emerald-500/20 to-teal-500/10",
        border: "border-emerald-500/30",
        emoji: "🌿",
        mood: "Peaceful & Ambient",
        description: "Maintain your tranquil state with soothing sounds",
        spotifyId: "37i9dQZF1DWXe9gFZP0gtP",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLQ_PIlf6OzqJkRrEj6XxqH8Xm6eQRHsGc",
        songs: [
            { title: "Weightless", artist: "Marconi Union", youtube: "https://www.youtube.com/watch?v=UfcAVejslrU" },
            { title: "Gymnopédie No.1", artist: "Erik Satie", youtube: "https://www.youtube.com/watch?v=S-Xm7s9eGxU" },
            { title: "River Flows in You", artist: "Yiruma", youtube: "https://www.youtube.com/watch?v=7maJOI3QMu0" },
            { title: "Experience", artist: "Ludovico Einaudi", youtube: "https://www.youtube.com/watch?v=hN_q-_nGv4U" },
        ],
    },
    Stress: {
        color: "#8b5cf6",
        gradient: "from-violet-500/20 to-purple-500/10",
        border: "border-violet-500/30",
        emoji: "🧘",
        mood: "Calming & Restorative",
        description: "Let these soothing tracks ease your stress away",
        spotifyId: "37i9dQZF1DX9uKNf5jGX6m",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Ar_3GPy3workxmJ9I9RWR",
        songs: [
            { title: "Clair de Lune", artist: "Debussy", youtube: "https://www.youtube.com/watch?v=CvFH_6DNRCY" },
            { title: "Comptine d'un autre été", artist: "Yann Tiersen", youtube: "https://www.youtube.com/watch?v=sAuEeM_6zpk" },
            { title: "Breathe (In the Air)", artist: "Pink Floyd", youtube: "https://www.youtube.com/watch?v=m6qcCKh8MSU" },
            { title: "Holocene", artist: "Bon Iver", youtube: "https://www.youtube.com/watch?v=TWcyIpul8OE" },
        ],
    },
    Angry: {
        color: "#ef4444",
        gradient: "from-red-500/20 to-rose-500/10",
        border: "border-red-500/30",
        emoji: "🔥",
        mood: "Release & Energise",
        description: "Channel that energy with these powerful tracks",
        spotifyId: "37i9dQZF1DWWJOmJ7nRx0C",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLH6pfBXQXHEC2uDmDy5oi3tHW6X8kZ0nP",
        songs: [
            { title: "Eye of the Tiger", artist: "Survivor", youtube: "https://www.youtube.com/watch?v=btPJPFnesV4" },
            { title: "Lose Yourself", artist: "Eminem", youtube: "https://www.youtube.com/watch?v=_Yhyp-_hX2s" },
            { title: "In the End", artist: "Linkin Park", youtube: "https://www.youtube.com/watch?v=eVTXPUF4Oz4" },
            { title: "Numb", artist: "Linkin Park", youtube: "https://www.youtube.com/watch?v=kXYiU_JCYtU" },
        ],
    },
    Sad: {
        color: "#3b82f6",
        gradient: "from-blue-500/20 to-indigo-500/10",
        border: "border-blue-500/30",
        emoji: "💙",
        mood: "Comforting & Healing",
        description: "You're not alone — music that understands and uplifts",
        spotifyId: "37i9dQZF1DX7gIoKXt0gmx",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLH6pfBXQXHECbXBCiRyM5n8bCrRfzBxOn",
        songs: [
            { title: "Fix You", artist: "Coldplay", youtube: "https://www.youtube.com/watch?v=k4V3Mo61fJM" },
            { title: "Someone Like You", artist: "Adele", youtube: "https://www.youtube.com/watch?v=hLQl3WQQoQ0" },
            { title: "The Sound of Silence", artist: "Simon & Garfunkel", youtube: "https://www.youtube.com/watch?v=4zLfCnGVeL4" },
            { title: "Skinny Love", artist: "Bon Iver", youtube: "https://www.youtube.com/watch?v=sIdcqbSB7Wc" },
        ],
    },
};

// ── YouTube SVG icon ─────────────────────────────────────────────────────────
const YTIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <path fill="#0a0b1e" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

// ── Spotify SVG icon ─────────────────────────────────────────────────────────
const SpotifyIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
const MusicRecommendations = ({ emotion }) => {
    const [tab, setTab] = useState("spotify"); // "spotify" | "youtube"
    const data = MUSIC_DATA[emotion];
    if (!data) return null;

    const spotifyUrl = `https://open.spotify.com/embed/playlist/${data.spotifyId}?utm_source=generator&theme=0`;

    return (
        <div
            className={`glass-card p-6 mt-6 border ${data.border} bg-gradient-to-br ${data.gradient}`}
        >
            {/* ── Header ── */}
            <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{data.emoji}</span>
                <h2 className="text-lg font-semibold text-white">Music Recommendations</h2>
            </div>
            <p className="text-xs text-slate-400 mb-1">{data.description}</p>
            <span
                className="inline-block mb-5 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${data.color}22`, color: data.color }}
            >
                {data.mood}
            </span>

            {/* ── Platform Tabs ── */}
            <div className="flex gap-2 mb-4">
                {/* Spotify tab */}
                <button
                    onClick={() => setTab("spotify")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={
                        tab === "spotify"
                            ? { background: "#1db95422", color: "#1db954", border: "1px solid #1db95466" }
                            : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                >
                    <SpotifyIcon className="w-4 h-4" />
                    Spotify
                </button>

                {/* YouTube tab */}
                <button
                    onClick={() => setTab("youtube")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={
                        tab === "youtube"
                            ? { background: "#ff000022", color: "#ff4444", border: "1px solid #ff444466" }
                            : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                >
                    <YTIcon className="w-4 h-4" />
                    YouTube
                </button>
            </div>

            {/* ── Spotify Player ── */}
            {tab === "spotify" && (
                <div className="rounded-xl overflow-hidden border border-white/10 mb-5">
                    <iframe
                        title={`${emotion} Spotify Playlist`}
                        src={spotifyUrl}
                        width="100%"
                        height="352"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        style={{ borderRadius: "12px", display: "block" }}
                    />
                </div>
            )}

            {/* ── YouTube Playlist Link ── */}
            {tab === "youtube" && (
                <>
                    <a
                        href={data.youtubePlaylist}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-xl mb-5 transition-all"
                        style={{ background: "#ff000015", border: "1px solid #ff444433" }}
                    >
                        <YTIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="text-white text-sm font-medium">Open Full Playlist on YouTube</p>
                            <p className="text-slate-500 text-xs mt-0.5">Opens in a new tab</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>

                    {/* Song Cards — YouTube tab only */}
                    <div>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">Songs</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {data.songs.map((song, i) => (
                                <a
                                    key={i}
                                    href={song.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10
                         hover:border-white/25 hover:bg-white/10 transition-all group"
                                >
                                    {/* Track number */}
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                                        style={{ background: `${data.color}22`, color: data.color }}
                                    >
                                        {i + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-sm font-medium truncate group-hover:text-white/90">{song.title}</p>
                                        <p className="text-slate-500 text-xs truncate">{song.artist}</p>
                                    </div>
                                    <YTIcon className="w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MusicRecommendations;
