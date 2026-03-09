import React, { useState, useEffect, useRef } from "react";

/* ── Music Data ─────────────────────────────────────────────────────────────
   Each emotion has two playlist sets:
   - "match"   → music matching the current emotion (default)
   - "improve" → music to guide toward a better emotional state
*/
const MUSIC_DATA = {
    Happy: {
        color: "#f59e0b", emoji: "🎉", mood: "Upbeat & Joyful",
        description: "Boost your happy energy with feel-good tracks",
        improveMood: "Calm", improveDesc: "Channel joy into peaceful focus",
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
        color: "#10b981", emoji: "🌿", mood: "Peaceful & Ambient",
        description: "Maintain your tranquil state with soothing sounds",
        improveMood: "Happy", improveDesc: "Lift your spirits gently",
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
        color: "#8b5cf6", emoji: "🧘", mood: "Calming & Restorative",
        description: "Let these soothing tracks ease your stress away",
        improveMood: "Calm", improveDesc: "Breathe & let music bring calm",
        breathing: true,
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
        color: "#ef4444", emoji: "🔥", mood: "Release & Energise",
        description: "Channel that energy with these powerful tracks",
        improveMood: "Calm", improveDesc: "Cool down with peaceful sound therapy",
        breathing: true,
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
        color: "#3b82f6", emoji: "💙", mood: "Comforting & Healing",
        description: "You're not alone — music that understands and uplifts",
        improveMood: "Happy", improveDesc: "Gentle uplift to brighter feelings",
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

/* ── Improve-mood playlists (different songs from the target emotion) ────── */
const IMPROVE_PLAYLISTS = {
    Calm: {
        spotifyId: "37i9dQZF1DWXe9gFZP0gtP",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLQ_PIlf6OzqJkRrEj6XxqH8Xm6eQRHsGc",
        songs: [
            { title: "Weightless", artist: "Marconi Union", youtube: "https://www.youtube.com/watch?v=UfcAVejslrU" },
            { title: "Spiegel im Spiegel", artist: "Arvo Pärt", youtube: "https://www.youtube.com/watch?v=TJ6Mzvh3XCc" },
            { title: "La Valse d'Amélie", artist: "Yann Tiersen", youtube: "https://www.youtube.com/watch?v=sMmn5iy_-z0" },
            { title: "Aqueous Transmission", artist: "Incubus", youtube: "https://www.youtube.com/watch?v=0U5z_KA0iU8" },
        ],
    },
    Happy: {
        spotifyId: "37i9dQZF1DXdPec7aLTmlC",
        youtubePlaylist: "https://www.youtube.com/playlist?list=PLDIoUOhQQPlXr63I_vwF9GD8sAKh77dWU",
        songs: [
            { title: "Walking on Sunshine", artist: "Katrina & The Waves", youtube: "https://www.youtube.com/watch?v=iPUmE-tne5U" },
            { title: "Don't Stop Me Now", artist: "Queen", youtube: "https://www.youtube.com/watch?v=HgzGwKwLmgM" },
            { title: "September", artist: "Earth Wind & Fire", youtube: "https://www.youtube.com/watch?v=Gs069dndIYk" },
            { title: "dancing in the moonlight", artist: "Toploader", youtube: "https://www.youtube.com/watch?v=3bEWS6bPSjI" },
        ],
    },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const YTIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <path fill="#030f0a" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);
const SpotifyIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
);

/* ── Breathing Exercise Widget (4-7-8 technique) ────────────────────────── */
const BreathingWidget = () => {
    const PHASES = [
        { label: "Inhale", duration: 4, color: "#10b981", instruction: "Breathe in slowly through your nose" },
        { label: "Hold", duration: 7, color: "#f59e0b", instruction: "Hold your breath gently" },
        { label: "Exhale", duration: 8, color: "#3b82f6", instruction: "Breathe out slowly through your mouth" },
    ];
    const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);

    const [active, setActive] = useState(false);
    const [phaseIdx, setPhase] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [cycles, setCycles] = useState(0);
    const intervalRef = useRef(null);

    const phase = PHASES[phaseIdx];
    const radius = 52;
    const circ = 2 * Math.PI * radius;
    const progress = phase ? Math.min(elapsed / phase.duration, 1) : 0;
    const dashOffset = circ * (1 - progress);
    const scale = 1 + progress * (phaseIdx === 0 ? 0.15 : phaseIdx === 2 ? -0.05 : 0);

    useEffect(() => {
        if (!active) { clearInterval(intervalRef.current); return; }
        intervalRef.current = setInterval(() => {
            setElapsed(e => {
                const next = e + 0.1;
                if (next >= PHASES[phaseIdx].duration) {
                    const nextPhase = (phaseIdx + 1) % PHASES.length;
                    setPhase(nextPhase);
                    if (nextPhase === 0) setCycles(c => c + 1);
                    return 0;
                }
                return next;
            });
        }, 100);
        return () => clearInterval(intervalRef.current);
    }, [active, phaseIdx]);

    const toggle = () => { setActive(a => !a); if (active) { setPhase(0); setElapsed(0); } };

    return (
        <div className="rounded-2xl p-5 mt-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(52,211,153,0.18)" }}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💨</span>
                <div>
                    <span className="text-white font-semibold text-sm font-['Nunito']">4-7-8 Breathing Exercise</span>
                    <p className="text-xs" style={{ color: "#5a8a72" }}>Activates the parasympathetic nervous system to reduce stress</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Animated circle */}
                <div className="relative flex-shrink-0">
                    <svg width="130" height="130" viewBox="0 0 130 130">
                        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <circle cx="65" cy="65" r={radius} fill="none"
                            stroke={phase?.color || "#10b981"} strokeWidth="8"
                            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}
                            style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.4s ease", transform: "rotate(-90deg)", transformOrigin: "65px 65px" }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"
                        style={{ transform: `scale(${scale})`, transition: "transform 0.3s ease" }}>
                        <div className="text-xl font-black text-white font-['Nunito']">{Math.ceil(phase.duration - elapsed)}</div>
                        <div className="text-xs font-semibold" style={{ color: phase?.color || "#10b981" }}>{phase?.label}</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm mb-1 text-white">{phase?.instruction}</p>
                    <p className="text-xs mb-4" style={{ color: "#5a8a72" }}>
                        {active ? `Cycle ${cycles + 1} · Phase ${phaseIdx + 1}/3` : "Press Start to begin guided breathing"}
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
                        <button onClick={toggle}
                            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: active ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", color: active ? "#fca5a5" : "#34d399", border: `1px solid ${active ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.35)"}` }}>
                            {active ? "Stop" : "▶ Start Breathing"}
                        </button>
                        {cycles > 0 && <span className="text-xs self-center" style={{ color: "#7fa891" }}>✅ {cycles} cycle{cycles > 1 ? "s" : ""} complete</span>}
                    </div>
                    <div className="flex gap-3 mt-3">
                        {PHASES.map((p) => (
                            <span key={p.label} className="text-xs flex items-center gap-1" style={{ color: "#5a8a72" }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                                {p.label} ({p.duration}s)
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ─────────────────────────────────────────────────────── */
const MusicRecommendations = ({ emotion }) => {
    const [tab, setTab] = useState("spotify");
    const [improveMode, setImprove] = useState(false);

    const base = MUSIC_DATA[emotion];
    if (!base) return null;

    const targetEmotion = improveMode ? base.improveMood : emotion;
    const improveData = improveMode ? IMPROVE_PLAYLISTS[base.improveMood] : null;

    const songs = improveMode ? (improveData?.songs || base.songs) : base.songs;
    const spotifyId = improveMode ? (improveData?.spotifyId || base.spotifyId) : base.spotifyId;
    const youtubeList = improveMode ? (improveData?.youtubePlaylist || base.youtubePlaylist) : base.youtubePlaylist;
    const displayColor = improveMode ? (MUSIC_DATA[base.improveMood]?.color || base.color) : base.color;
    const displayMood = improveMode ? `→ ${base.improveMood}: ${base.improveDesc}` : base.mood;
    const displayEmoji = improveMode ? (MUSIC_DATA[base.improveMood]?.emoji || "🎵") : base.emoji;

    const spotifyUrl = `https://open.spotify.com/embed/playlist/${spotifyId}?utm_source=generator&theme=0`;

    return (
        <div className="glass-card p-6 mt-6" style={{
            border: `1px solid ${displayColor}33`,
            background: `linear-gradient(135deg, ${displayColor}12 0%, rgba(3,15,10,0) 60%)`
        }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{displayEmoji}</span>
                    <h2 className="text-lg font-semibold text-white font-['Nunito']">Music Recommendations</h2>
                </div>

                {/* ── Improve Mood Toggle ── */}
                <button
                    onClick={() => setImprove(m => !m)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                        background: improveMode ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)",
                        color: improveMode ? "#34d399" : "#7fa891",
                        border: `1px solid ${improveMode ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    <span>{improveMode ? "✅" : "🌱"}</span>
                    Improve Mood
                </button>
            </div>

            <p className="text-xs mb-1" style={{ color: "#7fa891" }}>
                {improveMode ? base.improveDesc : base.description}
            </p>
            <span className="inline-block mb-5 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${displayColor}22`, color: displayColor }}>
                {displayMood}
            </span>

            {/* ── Breathing Widget (Stress/Angry only) ── */}
            {base.breathing && <BreathingWidget />}

            {/* ── Platform Tabs ── */}
            <div className="flex gap-2 mb-4 mt-4">
                <button onClick={() => setTab("spotify")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={tab === "spotify"
                        ? { background: "#1db95422", color: "#1db954", border: "1px solid #1db95466" }
                        : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <SpotifyIcon className="w-4 h-4" /> Spotify
                </button>
                <button onClick={() => setTab("youtube")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={tab === "youtube"
                        ? { background: "#ff000022", color: "#ff4444", border: "1px solid #ff444466" }
                        : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <YTIcon className="w-4 h-4" /> YouTube
                </button>
            </div>

            {/* ── Spotify Player ── */}
            {tab === "spotify" && (
                <div className="rounded-xl overflow-hidden border border-white/10 mb-5">
                    <iframe title={`${targetEmotion} Spotify Playlist`} src={spotifyUrl}
                        width="100%" height="352" frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy" style={{ borderRadius: "12px", display: "block" }} />
                </div>
            )}

            {/* ── YouTube Songs ── */}
            {tab === "youtube" && (
                <>
                    <a href={youtubeList} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-xl mb-5 transition-all"
                        style={{ background: "#ff000015", border: "1px solid #ff444433" }}>
                        <YTIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="text-white text-sm font-medium">Open Full Playlist on YouTube</p>
                            <p className="text-xs mt-0.5" style={{ color: "#5a8a72" }}>Opens in a new tab</p>
                        </div>
                        <svg className="w-4 h-4 ml-auto" style={{ color: "#5a8a72" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                    <div>
                        <p className="text-xs uppercase tracking-wider font-medium mb-3" style={{ color: "#5a8a72" }}>Songs</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {songs.map((song, i) => (
                                <a key={i} href={song.youtube} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/10 transition-all group">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                                        style={{ background: `${displayColor}22`, color: displayColor }}>{i + 1}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-sm font-medium truncate">{song.title}</p>
                                        <p className="text-xs truncate" style={{ color: "#5a8a72" }}>{song.artist}</p>
                                    </div>
                                    <YTIcon className="w-5 h-5 flex-shrink-0 group-hover:text-red-400 transition-colors" style={{ color: "#5a8a72" }} />
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
