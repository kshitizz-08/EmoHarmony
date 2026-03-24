/**
 * EmoHarmony — Emotional Reels Feed
 *
 * A proof-of-concept simulating how a major platform (Instagram/TikTok)
 * could use real-time facial emotion detection to curate the perfect reel feed.
 *
 * Features:
 *  - Instagram-style full-screen TikTok/Reel player
 *  - Background face-api.js emotion detection (invisible webcam)
 *  - Smart recommendation: next reel chosen based on your current emotion
 *  - Mood Goal selector: user picks a target feeling
 *  - Creator Analytics: Recharts line chart of viewer emotions over the video's timeline
 *  - "Palate Cleanser" intervention when negative emotion spiral detected
 */

import React, {
  useEffect, useRef, useState, useCallback,
} from "react";
import { Link } from "react-router-dom";
import * as faceapi from "face-api.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Navbar from "../components/Navbar";
import useAuthStore from "../store/useAuthStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS_URL = "/models";
const DETECT_INTERVAL_MS = 800;

const EMOTION_META = {
  happy:     { label: "Happy",     emoji: "😊", color: "#22c55e", valence: "positive" },
  calm:      { label: "Calm",      emoji: "😌", color: "#0d9488", valence: "positive" },
  neutral:   { label: "Neutral",   emoji: "😐", color: "#94a3b8", valence: "neutral"  },
  surprised: { label: "Surprised", emoji: "😮", color: "#f59e0b", valence: "positive" },
  sad:       { label: "Sad",       emoji: "😢", color: "#6366f1", valence: "negative" },
  fearful:   { label: "Fearful",   emoji: "😨", color: "#a855f7", valence: "negative" },
  disgusted: { label: "Disgusted", emoji: "🤢", color: "#84cc16", valence: "negative" },
  angry:     { label: "Angry",     emoji: "😠", color: "#ef4444", valence: "negative" },
};

// Indian content via YouTube embeds — verified video IDs sourced live from YouTube.
// YouTube embed URL format: https://www.youtube.com/embed/{videoId}?autoplay=1&loop=1&playlist={videoId}&mute=1
const REELS = [
  {
    id: 1,
    title: "Natu Natu 🎉 (RRR)",
    creator: "@SSRajamouli · T-Series",
    tag: "happy",
    videoId: "4_eEgJhsBMo",
    desc: "Oscar-winning smash hit from RRR — you can't help but dance!",
  },
  {
    id: 2,
    title: "Holi Festival 🌈 National Geographic",
    creator: "@NatGeo India",
    tag: "happy",
    videoId: "AbFIkJ8KFZ8",
    desc: "The festival of colours — pure joy, laughter, and vibrancy.",
  },
  {
    id: 3,
    title: "Kesariya 💛 (Brahmastra)",
    creator: "@ArijitSingh · Dharma",
    tag: "calm",
    videoId: "BddP6PYz2gs",
    desc: "Arijit Singh's soulful love anthem that melts every heart.",
  },
  {
    id: 4,
    title: "Mumbai Cheeseburst Vada Pav 🔥",
    creator: "@foodie.india",
    tag: "happy",
    videoId: "Q46S5BfashM",
    desc: "Famous Mumbai street food — cheesy, crispy, and absolutely fire!",
  },
  {
    id: 5,
    title: "ASMR Rain Walk 🌴 Kerala Village",
    creator: "@incredibleindia",
    tag: "calm",
    videoId: "CV2WZ78n9V0",
    desc: "4K monsoon ambience walk through a Kerala village — ultimate calm.",
  },
  {
    id: 6,
    title: "Virat Kohli Historic 100th Century 🏆",
    creator: "@BCCI · Cricket",
    tag: "surprised",
    videoId: "L7j9WkK-6o8",
    desc: "The moment India went wild — King Kohli makes history!",
  },
  {
    id: 7,
    title: "Bho Shambho — Bharatanatyam 💃",
    creator: "@Surabhi Bharadwaj",
    tag: "calm",
    videoId: "KCLQ_NR3RmI",
    desc: "Stunning Bharatanatyam solo — grace, precision, pure devotion.",
  },
  {
    id: 8,
    title: "Indian Team Diwali Celebration 🎆",
    creator: "@BCCI",
    tag: "surprised",
    videoId: "M-8hYRCe-5U",
    desc: "The Indian cricket team lights up Diwali — pure celebration energy!",
  },
  {
    id: 9,
    title: "Vande Mataram 🇮🇳 AR Rahman",
    creator: "@ARRahman · Sony Music",
    tag: "happy",
    videoId: "jDn2bn7_YSM",
    desc: "The goosebump anthem of a billion hearts — Jai Hind!",
  },
  {
    id: 10,
    title: "Indian Masala Chai ☕ Street Stall",
    creator: "@india.streets",
    tag: "calm",
    videoId: "xmWCONEI2-Q",
    desc: "Roadside ginger masala chai — the magic of Indian mornings.",
  },
];

// ─── Mood Goals ───────────────────────────────────────────────────────────────
const MOOD_GOALS = [
  { key: "any",       label: "✨ Any Mood",    desc: "Let the AI decide",       tags: ["happy","calm","surprised","neutral"] },
  { key: "happy",     label: "😄 Make Me Laugh", desc: "Boost positive energy",   tags: ["happy", "surprised"] },
  { key: "calm",      label: "😌 Calm Me Down",  desc: "Relax & decompress",      tags: ["calm"] },
  { key: "energized", label: "⚡ Energize Me",   desc: "Get pumped & inspired",   tags: ["happy", "surprised"] },
];

// ─── Recommendation Engine ────────────────────────────────────────────────────
function getNextReel(currentId, currentEmotion, moodGoalKey, reelHistory) {
  const meta = EMOTION_META[currentEmotion] ?? EMOTION_META.neutral;
  const goal = MOOD_GOALS.find(g => g.key === moodGoalKey) ?? MOOD_GOALS[0];

  // If feeling negative → palate cleanse by serving calm
  let targetTags = goal.tags;
  if (meta.valence === "negative") {
    targetTags = ["calm", "happy"];
  }

  // Filter reels matching the target tag, that aren't current or recently seen
  const recent = reelHistory.slice(-3);
  let candidates = REELS.filter(r =>
    r.id !== currentId &&
    !recent.includes(r.id) &&
    targetTags.includes(r.tag)
  );

  // Widen if no candidates
  if (candidates.length === 0) {
    candidates = REELS.filter(r => r.id !== currentId && !recent.includes(r.id));
  }
  if (candidates.length === 0) {
    candidates = REELS.filter(r => r.id !== currentId);
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? REELS[0];
}

function dominant(emotionLog) {
  if (!emotionLog.length) return "neutral";
  const counts = {};
  emotionLog.forEach(e => { counts[e] = (counts[e] ?? 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatPill = ({ label, value, color }) => (
  <div style={{
    background: "var(--bg-subtle)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "6px 14px", textAlign: "center",
  }}>
    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: color ?? "var(--text-primary)", marginTop: 2 }}>{value}</div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const EmotionalReels = () => {
  // ── auth ──
  const user = useAuthStore(s => s.user);

  // ── refs ──
  const videoRef      = useRef(null); // reel video
  const camRef        = useRef(null); // hidden webcam
  const streamRef     = useRef(null);
  const loopRef       = useRef(null);

  // ── AI ──
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [loadStep,      setLoadStep]      = useState(0);
  const [cameraOn,      setCameraOn]      = useState(false);
  const [currentEmo,    setCurrentEmo]    = useState(null);  // { key, label, emoji, color }
  const [emotionLog,    setEmotionLog]    = useState([]);    // array of emotion keys for current reel
  const [analyticsData, setAnalyticsData] = useState([]);   // [{t, score, emotion}] per-reel timeline

  // ── reel state ──
  const [currentReel,   setCurrentReel]   = useState(REELS[0]);
  const [reelHistory,   setReelHistory]   = useState([REELS[0].id]);
  const [moodGoalKey,   setMoodGoalKey]   = useState("any");
  const [reelCount,     setReelCount]     = useState(1);
  const [isMuted,       setIsMuted]       = useState(true); // must start muted for autoplay
  const [paletteCleanse, setPaletteCleanse] = useState(false);
  const [showAnalytics,  setShowAnalytics]  = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(true);

  // reel start time ref for timeline
  const reelStartRef = useRef(Date.now());

  // ── 1. Load Face-API models ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadStep(1);
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        if (cancelled) return;
        setLoadStep(2);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL);
        if (cancelled) return;
        setLoadStep(3);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL);
        if (!cancelled) setModelsLoaded(true);
      } catch (e) {
        console.error("Failed to load models", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── 2. Start/stop invisible webcam ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      if (camRef.current) {
        camRef.current.srcObject = stream;
        await camRef.current.play();
      }
      setCameraOn(true);
    } catch {
      console.warn("Camera access denied — running without emotion detection.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(loopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setCurrentEmo(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── 3. Detection loop ──
  useEffect(() => {
    if (!cameraOn || !modelsLoaded) return;
    const detect = async () => {
      const cam = camRef.current;
      if (!cam || cam.readyState < 2) return;
      const det = await faceapi
        .detectSingleFace(cam, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceExpressions();
      if (!det) return;

      // De-bias neutral
      const exp = { ...det.expressions };
      if (exp.neutral !== undefined) exp.neutral *= 0.2;
      const total = Object.values(exp).reduce((s, v) => s + v, 0);
      if (total > 0) Object.keys(exp).forEach(k => { exp[k] /= total; });

      const [topKey, topConf] = Object.entries(exp).sort((a, b) => b[1] - a[1])[0];
      const meta = EMOTION_META[topKey] ?? EMOTION_META.neutral;

      setCurrentEmo({ key: topKey, conf: Math.round(topConf * 100), ...meta });
      setEmotionLog(prev => [...prev, topKey]);

      // Update analytics timeline
      const elapsed = Math.round((Date.now() - reelStartRef.current) / 1000);
      setAnalyticsData(prev => [
        ...prev,
        { t: elapsed, score: Math.round(topConf * 100), emotion: meta.label, color: meta.color },
      ]);
    };

    loopRef.current = setInterval(detect, DETECT_INTERVAL_MS);
    return () => clearInterval(loopRef.current);
  }, [cameraOn, modelsLoaded]);

  // ── 4. Advance to next reel ──
  const goNextReel = useCallback(() => {
    const dom = dominant(emotionLog);
    const meta = EMOTION_META[dom] ?? EMOTION_META.neutral;
    const isNegative = meta.valence === "negative";

    const next = getNextReel(currentReel.id, dom, moodGoalKey, reelHistory);
    setPaletteCleanse(isNegative);
    setTimeout(() => setPaletteCleanse(false), 3000);

    setCurrentReel(next);
    setReelHistory(prev => [...prev, next.id]);
    setReelCount(c => c + 1);
    setEmotionLog([]);
    setAnalyticsData([]);
    reelStartRef.current = Date.now();
    setShowAnalytics(false);
    // YouTube iframe reloads automatically via key change on currentReel
  }, [currentReel.id, emotionLog, moodGoalKey, reelHistory]);

  const handleStartWatching = async (goalKey) => {
    setMoodGoalKey(goalKey);
    setShowMoodPicker(false);
    await startCamera();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const dominantEmo = dominant(emotionLog);
  const dominantMeta = EMOTION_META[dominantEmo] ?? EMOTION_META.neutral;

  return (
    <div className={user ? "app-shell" : ""} style={!user ? { minHeight: "100vh", background: "var(--bg-page, #f8fafc)" } : {}}>
      {user ? <Navbar /> : (
        /* ─ Standalone topbar for demo / unauthenticated access ─ */
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", height: 54,
          background: "#fff", borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>🎬</div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              Emo<span style={{ color: "#6366f1" }}>Harmony</span>
              <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 13, marginLeft: 8 }}>
                · Emotional Reels
              </span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/login" style={{
              padding: "6px 16px", borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff", color: "#374151",
              fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}>Sign In</Link>
            <Link to="/register" style={{
              padding: "6px 16px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}>Get Started</Link>
          </div>
        </header>
      )}

      {/* Hidden camera for background detection */}
      <video
        ref={camRef}
        autoPlay playsInline muted
        style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1, top: -9999 }}
      />

      <div
        className={user ? "app-main page-enter" : ""}
        style={!user ? { padding: "24px 32px", maxWidth: 1200, margin: "0 auto" } : {}}
      >

        {/* ── Top bar ── */}
        <div className="app-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #f43f5e, #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, flexShrink: 0,
            }}>🎬</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Emotional Reels</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>· AI-Powered Feed</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* AI status badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 20,
              background: modelsLoaded ? (cameraOn ? "#dcfce7" : "#f0fdf4") : "var(--bg-subtle)",
              border: `1px solid ${modelsLoaded ? (cameraOn ? "#86efac" : "#bbf7d0") : "var(--border)"}`,
              fontSize: 12, fontWeight: 600,
              color: modelsLoaded ? (cameraOn ? "#15803d" : "#166534") : "var(--text-muted)",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: modelsLoaded ? (cameraOn ? "#22c55e" : "#86efac") : "#e5e7eb",
                display: "inline-block",
                animation: cameraOn ? "pulse 1.5s infinite" : "none",
              }} />
              {!modelsLoaded ? `Loading AI… (${loadStep}/3)` : cameraOn ? "Emotion AI Active" : "AI Ready"}
            </div>

            {!showMoodPicker && (
              <button
                onClick={() => setShowMoodPicker(true)}
                style={{
                  padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: "1px solid var(--border)", background: "var(--bg-surface)",
                  color: "var(--text-secondary)", cursor: "pointer",
                }}
              >
                🎯 Change Mood Goal
              </button>
            )}
          </div>
        </div>

        <div className="app-content">

          {/* ── Mood Picker Modal ── */}
          {showMoodPicker && (
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "32px 28px", marginBottom: 24,
              textAlign: "center", maxWidth: 560, margin: "0 auto 24px",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                How do you want to feel?
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
                The AI will curate your reel feed to match this goal using real-time facial emotion detection.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {MOOD_GOALS.map(g => (
                  <button
                    key={g.key}
                    onClick={() => handleStartWatching(g.key)}
                    style={{
                      padding: "16px 14px", borderRadius: 12,
                      border: "1.5px solid var(--border)",
                      background: "var(--bg-subtle)",
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "linear-gradient(135deg, rgba(244,63,94,0.08), rgba(236,72,153,0.08))";
                      e.currentTarget.style.borderColor = "#f43f5e";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "var(--bg-subtle)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                🔒 Emotion detection runs 100% in your browser. No video data is ever uploaded.
              </div>
            </div>
          )}

          {/* ── Palate Cleanse Banner ── */}
          {paletteCleanse && (
            <div style={{
              background: "linear-gradient(135deg, #0d9488, #0891b2)",
              color: "#fff", borderRadius: 10,
              padding: "10px 18px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, fontWeight: 600,
              animation: "slideDown 0.4s ease",
            }}>
              <span style={{ fontSize: 20 }}>🌿</span>
              <div>
                <div>Palate Cleanser Activated</div>
                <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
                  We detected a negative mood. Switching to a calming reel to help you reset.
                </div>
              </div>
            </div>
          )}

          {/* ── Main layout: video + sidebar ── */}
          {!showMoodPicker && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 20,
              alignItems: "start",
            }}>

              {/* ── Left: Reel player ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Video card */}
                <div style={{
                  background: "#000",
                  borderRadius: 16,
                  overflow: "hidden",
                  position: "relative",
                  aspectRatio: "16/9",
                  border: "1px solid var(--border)",
                }}>
                  {/* YouTube iframe player */}
                  <iframe
                    key={`${currentReel.id}-${isMuted}`}
                    ref={videoRef}
                    src={`https://www.youtube.com/embed/${currentReel.videoId}?autoplay=1&loop=1&playlist=${currentReel.videoId}&mute=${isMuted ? 1 : 0}&controls=0&rel=0&modestbranding=1&playsinline=1`}
                    title={currentReel.title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      border: "none", display: "block",
                    }}
                  />

                  {/* Reel info overlay */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                    padding: "32px 18px 18px",
                    color: "#fff",
                  }}>
                    <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>{currentReel.creator}</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{currentReel.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{currentReel.desc}</div>
                  </div>

                  {/* Live emotion badge (top-right overlay) */}
                  {currentEmo && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      background: "rgba(0,0,0,0.7)",
                      backdropFilter: "blur(8px)",
                      color: currentEmo.color,
                      border: `1px solid ${currentEmo.color}50`,
                      padding: "5px 12px", borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <span>{currentEmo.emoji}</span>
                      <span style={{ color: "#fff" }}>{currentEmo.label}</span>
                      <span style={{ fontSize: 10, color: currentEmo.color }}>{currentEmo.conf}%</span>
                    </div>
                  )}

                  {/* Mute/Unmute button */}
                  <button
                    onClick={() => setIsMuted(m => !m)}
                    style={{
                      position: "absolute", top: 12, left: 12,
                      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                      color: "#fff", border: "none", cursor: "pointer",
                      padding: "6px 12px", borderRadius: 20,
                      fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {isMuted ? "🔇 Unmute" : "🔊 Mute"}
                  </button>

                  {/* Reel number badge */}
                  <div style={{
                    position: "absolute", bottom: 90, right: 12,
                    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
                    color: "#fff", padding: "4px 10px", borderRadius: 16,
                    fontSize: 11, fontWeight: 600,
                  }}>
                    #{reelCount}
                  </div>
                </div>

                {/* Controls row */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    onClick={goNextReel}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #f43f5e, #ec4899)",
                      color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: "0 3px 12px rgba(244,63,94,0.35)",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    ⏭ Next Reel
                  </button>

                  <button
                    onClick={() => setShowAnalytics(s => !s)}
                    style={{
                      padding: "11px 18px", borderRadius: 10, border: "1px solid var(--border)",
                      background: "var(--bg-surface)", color: "var(--text-primary)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {showAnalytics ? "Hide" : "📊"} Analytics
                  </button>
                </div>

                {/* ── Creator Analytics Section ── */}
                {showAnalytics && (
                  <div style={{
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: 14, padding: "20px 20px 16px",
                    animation: "slideDown 0.3s ease",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
                      📈 Creator Emotion Analytics
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                      Real-time viewer emotion confidence while watching this reel. At which second are viewers happiest?
                    </div>

                    {analyticsData.length > 2 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={analyticsData} margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis
                            dataKey="t" tickFormatter={v => `${v}s`}
                            tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false}
                          />
                          <YAxis
                            domain={[0, 100]} tickFormatter={v => `${v}%`}
                            tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={38} axisLine={false}
                          />
                          <Tooltip
                            formatter={(value, _name, props) => [`${value}%`, props.payload.emotion]}
                            labelFormatter={v => `${v}s into reel`}
                            contentStyle={{
                              background: "var(--bg-surface)", border: "1px solid var(--border)",
                              borderRadius: 8, fontSize: 12,
                            }}
                          />
                          <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "High", fill: "#22c55e", fontSize: 10 }} />
                          <Line
                            type="monotone" dataKey="score"
                            stroke="#f43f5e" strokeWidth={2.5}
                            dot={false} activeDot={{ r: 5, fill: "#ec4899", strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{
                        height: 120, display: "flex", alignItems: "center",
                        justifyContent: "center", color: "var(--text-muted)", fontSize: 13, gap: 8,
                      }}>
                        <span style={{ fontSize: 24 }}>👁️</span>
                        Keep watching — data populates as you view the reel
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Right sidebar ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Session stats */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                    Session Stats
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <StatPill label="Reels Watched" value={reelCount} />
                    <StatPill label="Mood Goal" value={MOOD_GOALS.find(g => g.key === moodGoalKey)?.label || "Any"} />
                    <StatPill label="Current Reel Tag" value={`${EMOTION_META[currentReel.tag]?.emoji} ${currentReel.tag}`} color={EMOTION_META[currentReel.tag]?.color} />
                    <StatPill
                      label="Your Emotion"
                      value={currentEmo ? `${currentEmo.emoji} ${currentEmo.label}` : "—"}
                      color={currentEmo?.color}
                    />
                  </div>
                </div>

                {/* Live emotion card */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "20px 18px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
                    Your Real-Time Emotion
                  </div>
                  {currentEmo ? (
                    <>
                      <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>{currentEmo.emoji}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: currentEmo.color }}>{currentEmo.label}</div>
                      <div style={{
                        marginTop: 8, fontSize: 13,
                        background: `${currentEmo.color}1a`,
                        color: currentEmo.color, borderRadius: 20,
                        padding: "3px 14px", display: "inline-block", fontWeight: 600,
                      }}>
                        {currentEmo.conf}% confidence
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 42, marginBottom: 8, opacity: 0.4 }}>😶</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {cameraOn ? "Reading your expression…" : "Camera not active"}
                      </div>
                    </>
                  )}
                </div>

                {/* Dominant emotion for this reel */}
                {emotionLog.length >= 3 && (
                  <div style={{
                    background: `${dominantMeta.color}10`,
                    border: `1px solid ${dominantMeta.color}40`,
                    borderRadius: 14, padding: "14px 16px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                      Dominant So Far
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{dominantMeta.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: dominantMeta.color, fontSize: 15 }}>{dominantMeta.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Most common while watching this reel
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* How it works */}
                <div style={{
                  background: "var(--bg-subtle)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
                    🤖 How the AI Works
                  </div>
                  {[
                    { icon: "📷", text: "Invisible webcam detects your micro-expressions every 0.8s." },
                    { icon: "🧠", text: "Face-API.js classifies your emotion in real-time, locally in-browser." },
                    { icon: "⚙️", text: "The recommendation engine picks the next reel based on your emotional state + mood goal." },
                    { icon: "🌿", text: "If it detects a negative spiral, it auto-inserts a calming palate cleanser." },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.text}</span>
                    </div>
                  ))}
                  <div style={{
                    marginTop: 8, padding: "8px 10px",
                    background: "var(--bg-surface)", borderRadius: 8,
                    fontSize: 11, color: "var(--text-muted)",
                    display: "flex", gap: 6,
                  }}>
                    🔒 All processing is 100% local. No video is uploaded.
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default EmotionalReels;
