import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import * as faceapi from "face-api.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import Navbar from "../components/Navbar";
import useAuthStore from "../store/useAuthStore";

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

const REELS = [
  { id: 1,  title: "Natu Natu 🎉 (RRR)",           creator: "@SSRajamouli · T-Series",  tag: "happy",     videoId: "4_eEgJhsBMo", desc: "Oscar-winning smash hit — you can't help but dance!" },
  { id: 2,  title: "Holi Festival 🌈 NatGeo India", creator: "@NatGeo India",            tag: "happy",     videoId: "AbFIkJ8KFZ8", desc: "Festival of colours — pure joy, laughter, and vibrancy." },
  { id: 3,  title: "Kesariya 💛 (Brahmastra)",      creator: "@ArijitSingh · Dharma",    tag: "calm",      videoId: "BddP6PYz2gs", desc: "Arijit Singh's soulful love anthem that melts every heart." },
  { id: 4,  title: "Mumbai Cheeseburst Vada Pav 🔥", creator: "@foodie.india",           tag: "happy",     videoId: "Q46S5BfashM", desc: "Famous Mumbai street food — cheesy, crispy, absolutely fire!" },
  { id: 5,  title: "ASMR Rain Walk 🌴 Kerala",      creator: "@incredibleindia",         tag: "calm",      videoId: "CV2WZ78n9V0", desc: "4K monsoon ambience walk through a Kerala village — ultimate calm." },
  { id: 6,  title: "Virat Kohli 100th Century 🏆",  creator: "@BCCI · Cricket",          tag: "surprised", videoId: "L7j9WkK-6o8", desc: "The moment India went wild — King Kohli makes history!" },
  { id: 7,  title: "Bho Shambho — Bharatanatyam 💃", creator: "@SurabhiBharadwaj",       tag: "calm",      videoId: "KCLQ_NR3RmI", desc: "Stunning Bharatanatyam solo — grace, precision, pure devotion." },
  { id: 8,  title: "Indian Team Diwali 🎆",          creator: "@BCCI",                   tag: "surprised", videoId: "M-8hYRCe-5U", desc: "The Indian cricket team lights up Diwali — pure celebration!" },
  { id: 9,  title: "Vande Mataram 🇮🇳 AR Rahman",  creator: "@ARRahman · Sony Music",   tag: "happy",     videoId: "jDn2bn7_YSM", desc: "The goosebump anthem of a billion hearts — Jai Hind!" },
  { id: 10, title: "Masala Chai ☕ Street Stall",    creator: "@india.streets",           tag: "calm",      videoId: "xmWCONEI2-Q", desc: "Roadside ginger masala chai — the magic of Indian mornings." },
  { id: 11, title: "Tum Hi Ho 💔 (Aashiqui 2)",     creator: "@ArijitSingh · T-Series",  tag: "sad",       videoId: "Ijl_suHbBmY", desc: "The most iconic sad love song of a generation." },
  { id: 12, title: "Channa Mereya 😢 (Ae Dil)",     creator: "@Pritam · Dharma",         tag: "sad",       videoId: "gm5BsmKFcL4", desc: "Arijit's heartbreak masterpiece — pure raw emotion." },
  { id: 13, title: "Zakir Khan Stand-Up 😂",         creator: "@ZakirKhan",              tag: "happy",     videoId: "A8kT6-sMj7A", desc: "India's most beloved comedian — guaranteed to make you laugh!" },
  { id: 14, title: "Mumbai Monsoon Streets ⛈️",     creator: "@mumbaistreets",           tag: "calm",      videoId: "8lH7amfMHhU", desc: "Mumbai monsoon ASMR — hypnotic rain on the city chowks." },
  { id: 15, title: "Rang De Basanti Tribute 🇮🇳",  creator: "@bollywoodclips",          tag: "sad",       videoId: "LfmrHTdXgOI", desc: "India's most moving patriotic scene — goosebumps." },
  { id: 16, title: "MS Dhoni Last Walk 🏏",          creator: "@BCCI",                   tag: "sad",       videoId: "0TlYQDl2MKY", desc: "The farewell that broke a billion hearts." },
  { id: 17, title: "Bekhayali 💭 (Kabir Singh)",    creator: "@SachetTandon · T-Series", tag: "sad",       videoId: "wFSobJKi3-E", desc: "Raw, aching longing — a masterpiece of pain and longing." },
  { id: 18, title: "Pahadi ASMR 🏔️ Himachal",      creator: "@indiatravel",             tag: "calm",      videoId: "ZM_IvGjZmrM", desc: "Misty Himalayan villages — pure peace and tranquility." },
  { id: 19, title: "PV Sindhu Gold 🥇 Tokyo",       creator: "@Olympics · BAI",          tag: "surprised", videoId: "tH6s-HL9V44", desc: "India's pride wins Gold — the entire arena erupts in joy!" },
  { id: 20, title: "Baarish 🌧️ (Half Girlfriend)", creator: "@ArijitSingh · T-Series",  tag: "calm",      videoId: "Fg5JFk-5d_w", desc: "Perfect rain song — melancholic calm for the soul." },
];

const MOOD_GOALS = [
  { key: "any",       label: "✨ Any Mood",     desc: "Let the AI decide",      tags: ["happy","calm","surprised","neutral","sad"] },
  { key: "happy",     label: "😄 Make Me Laugh", desc: "Boost positive energy",  tags: ["happy","surprised"] },
  { key: "calm",      label: "😌 Calm Me Down",  desc: "Relax & decompress",     tags: ["calm"] },
  { key: "energized", label: "⚡ Energize Me",   desc: "Get pumped & inspired",  tags: ["happy","surprised"] },
];

function getNextReel(currentId, currentEmotion, moodGoalKey, reelHistory, likedIds) {
  const meta = EMOTION_META[currentEmotion] ?? EMOTION_META.neutral;
  const goal = MOOD_GOALS.find(g => g.key === moodGoalKey) ?? MOOD_GOALS[0];
  let targetTags = goal.tags;
  if (meta.valence === "negative") targetTags = ["calm", "happy"];
  const recent = reelHistory.slice(-3);
  let pool = REELS.filter(r => r.id !== currentId && !recent.includes(r.id));
  let candidates = pool.filter(r => targetTags.includes(r.tag));
  if (candidates.length === 0) candidates = pool;
  if (candidates.length === 0) candidates = REELS.filter(r => r.id !== currentId);
  const liked = candidates.filter(r => likedIds.includes(r.id));
  if (liked.length > 0 && Math.random() > 0.6) return liked[Math.floor(Math.random() * liked.length)];
  return candidates[Math.floor(Math.random() * candidates.length)] ?? REELS[0];
}

function dominant(log) {
  if (!log.length) return "neutral";
  const c = {};
  log.forEach(e => { c[e] = (c[e] ?? 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Sub-components ──────────────────────────────────────────────────────────

const StatPill = ({ label, value, color }) => (
  <div style={{ background:"var(--bg-subtle)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 12px", textAlign:"center" }}>
    <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
    <div style={{ fontSize:14, fontWeight:700, color: color ?? "var(--text-primary)", marginTop:2 }}>{value}</div>
  </div>
);

const UpNextCard = ({ reel }) => {
  if (!reel) return null;
  const meta = EMOTION_META[reel.tag] ?? EMOTION_META.neutral;
  return (
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>⏭ Up Next (AI Pick)</div>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <img src={`https://img.youtube.com/vi/${reel.videoId}/mqdefault.jpg`} alt={reel.title}
          style={{ width:80, height:52, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{reel.title}</div>
          <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{reel.creator}</div>
          <div style={{ marginTop:5, display:"inline-flex", alignItems:"center", gap:4, background:`${meta.color}18`, color:meta.color, borderRadius:12, padding:"2px 8px", fontSize:10, fontWeight:700 }}>
            {meta.emoji} {reel.tag}
          </div>
        </div>
      </div>
    </div>
  );
};

const ManualEmotionChips = ({ onSelect, current }) => (
  <div style={{ background:"var(--bg-subtle)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px" }}>
    <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>💬 Tell us how you feel</div>
    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
      {Object.entries(EMOTION_META).map(([key, m]) => (
        <button key={key} onClick={() => onSelect(key)} style={{
          padding:"5px 12px", borderRadius:20,
          border:`1.5px solid ${current === key ? m.color : "var(--border)"}`,
          background: current === key ? `${m.color}18` : "var(--bg-surface)",
          color: current === key ? m.color : "var(--text-secondary)",
          fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
        }}>{m.emoji} {m.label}</button>
      ))}
    </div>
  </div>
);

const SessionReport = ({ onClose, reelCount, allEmotions, likedReels, sessionSeconds }) => {
  const counts = {};
  allEmotions.forEach(e => { counts[e] = (counts[e] ?? 0) + 1; });
  const barData = Object.entries(EMOTION_META)
    .map(([key, m]) => ({ name: m.emoji + " " + m.label, value: counts[key] ?? 0, color: m.color }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  const dom = dominant(allEmotions);
  const domMeta = EMOTION_META[dom] ?? EMOTION_META.neutral;
  const mins = Math.floor(sessionSeconds / 60);
  const secs = sessionSeconds % 60;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"var(--bg-surface)", borderRadius:20, padding:"32px 28px", maxWidth:460, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,0.3)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40 }}>📊</div>
          <div style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", marginTop:8 }}>Session Report</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:4 }}>Here's how your watching session went</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
          <StatPill label="Reels" value={reelCount} />
          <StatPill label="Duration" value={`${mins}m ${secs}s`} />
          <StatPill label="Liked" value={likedReels.length} color="#22c55e" />
        </div>
        <div style={{ background:`${domMeta.color}12`, border:`1px solid ${domMeta.color}40`, borderRadius:12, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:32 }}>{domMeta.emoji}</span>
          <div>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase" }}>Your Dominant Mood</div>
            <div style={{ fontSize:18, fontWeight:800, color:domMeta.color }}>{domMeta.label}</div>
          </div>
        </div>
        {barData.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", marginBottom:10 }}>Emotion Distribution</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={barData} margin={{ left:-20, right:0, top:0, bottom:0 }}>
                <YAxis tick={{ fontSize:10, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`${v} detections`, "Count"]} contentStyle={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:8, fontSize:11 }} />
                <Bar dataKey="value" radius={4}>{barData.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {likedReels.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", marginBottom:8 }}>👍 Liked Reels</div>
            {likedReels.map(r => (
              <div key={r.id} style={{ fontSize:12, color:"var(--text-secondary)", padding:"4px 0", borderBottom:"1px solid var(--border)" }}>{r.title}</div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ width:"100%", padding:"12px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#f43f5e,#ec4899)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          Close Report
        </button>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
const EmotionalReels = () => {
  const user = useAuthStore(s => s.user);

  const videoRef       = useRef(null);
  const camRef         = useRef(null);
  const streamRef      = useRef(null);
  const loopRef        = useRef(null);
  const reelStartRef   = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());

  const [modelsLoaded,   setModelsLoaded]   = useState(false);
  const [loadStep,       setLoadStep]       = useState(0);
  const [cameraOn,       setCameraOn]       = useState(false);
  const [currentEmo,     setCurrentEmo]     = useState(null);
  const [emotionLog,     setEmotionLog]     = useState([]);
  const [allEmotions,    setAllEmotions]    = useState([]);
  const [analyticsData,  setAnalyticsData]  = useState([]);
  const [currentReel,    setCurrentReel]    = useState(REELS[0]);
  const [reelHistory,    setReelHistory]    = useState([REELS[0].id]);
  const [moodGoalKey,    setMoodGoalKey]    = useState("any");
  const [reelCount,      setReelCount]      = useState(1);
  const [isMuted,        setIsMuted]        = useState(true);
  const [paletteCleanse, setPaletteCleanse] = useState(false);
  const [showAnalytics,  setShowAnalytics]  = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(true);
  const [likedIds,       setLikedIds]       = useState([]);
  const [dislikedIds,    setDislikedIds]    = useState([]);
  const [likedReels,     setLikedReels]     = useState([]);
  const [showReport,     setShowReport]     = useState(false);
  const [transitioning,  setTransitioning]  = useState(false);
  const [manualEmo,      setManualEmo]      = useState(null);

  // Load face-api models
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadStep(1); await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);    if (cancelled) return;
        setLoadStep(2); await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL); if (cancelled) return;
        setLoadStep(3); await faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL);
        if (!cancelled) setModelsLoaded(true);
      } catch (e) { console.error("Failed to load models", e); }
    })();
    return () => { cancelled = true; };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:320, height:240, facingMode:"user" } });
      streamRef.current = stream;
      if (camRef.current) { camRef.current.srcObject = stream; await camRef.current.play(); }
      setManualEmo(null);
      setCameraOn(true);
    } catch { console.warn("Camera access denied."); }
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(loopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setCurrentEmo(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Detection loop
  useEffect(() => {
    if (!cameraOn || !modelsLoaded) return;
    const detect = async () => {
      const cam = camRef.current;
      if (!cam || cam.readyState < 2) return;
      const det = await faceapi
        .detectSingleFace(cam, new faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.5 }))
        .withFaceLandmarks(true).withFaceExpressions();
      if (!det) return;
      const exp = { ...det.expressions };
      if (exp.neutral !== undefined) exp.neutral *= 0.2;
      const total = Object.values(exp).reduce((s, v) => s + v, 0);
      if (total > 0) Object.keys(exp).forEach(k => { exp[k] /= total; });
      const [topKey, topConf] = Object.entries(exp).sort((a, b) => b[1] - a[1])[0];
      const meta = EMOTION_META[topKey] ?? EMOTION_META.neutral;
      setCurrentEmo({ key:topKey, conf:Math.round(topConf * 100), ...meta });
      setEmotionLog(prev => [...prev, topKey]);
      setAllEmotions(prev => [...prev, topKey]);
      const elapsed = Math.round((Date.now() - reelStartRef.current) / 1000);
      setAnalyticsData(prev => [...prev, { t:elapsed, score:Math.round(topConf * 100), emotion:meta.label, color:meta.color }]);
    };
    loopRef.current = setInterval(detect, DETECT_INTERVAL_MS);
    return () => clearInterval(loopRef.current);
  }, [cameraOn, modelsLoaded]);

  const handleManualEmo = useCallback((key) => {
    const meta = EMOTION_META[key];
    setManualEmo(key);
    setCurrentEmo({ key, conf:90, ...meta });
    setEmotionLog(prev => [...prev, key]);
    setAllEmotions(prev => [...prev, key]);
  }, []);

  const effectiveEmoKey = currentEmo?.key ?? manualEmo ?? "neutral";

  const upNextReel = useMemo(() =>
    getNextReel(currentReel.id, effectiveEmoKey, moodGoalKey, reelHistory, likedIds),
    [currentReel.id, effectiveEmoKey, moodGoalKey, reelHistory, likedIds]
  );

  const goNextReel = useCallback(() => {
    const dom = dominant(emotionLog);
    const meta = EMOTION_META[dom] ?? EMOTION_META.neutral;
    const next = getNextReel(currentReel.id, dom, moodGoalKey, reelHistory, likedIds);
    setPaletteCleanse(meta.valence === "negative");
    setTimeout(() => setPaletteCleanse(false), 3000);
    setTransitioning(true);
    setTimeout(() => {
      setCurrentReel(next);
      setReelHistory(prev => [...prev, next.id]);
      setReelCount(c => c + 1);
      setEmotionLog([]);
      setAnalyticsData([]);
      reelStartRef.current = Date.now();
      setShowAnalytics(false);
      setTransitioning(false);
    }, 300);
  }, [currentReel.id, emotionLog, moodGoalKey, reelHistory, likedIds]);

  const handleStartWatching = async (goalKey) => {
    setMoodGoalKey(goalKey);
    setShowMoodPicker(false);
    await startCamera();
  };

  const handleLike = () => {
    if (likedIds.includes(currentReel.id)) return;
    setLikedIds(prev => [...prev, currentReel.id]);
    setLikedReels(prev => prev.find(r => r.id === currentReel.id) ? prev : [...prev, currentReel]);
    setDislikedIds(prev => prev.filter(id => id !== currentReel.id));
  };

  const handleDislike = () => {
    if (!dislikedIds.includes(currentReel.id)) {
      setDislikedIds(prev => [...prev, currentReel.id]);
      setLikedIds(prev => prev.filter(id => id !== currentReel.id));
      setLikedReels(prev => prev.filter(r => r.id !== currentReel.id));
    }
    goNextReel();
  };

  const sessionSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
  const ambientColor   = currentEmo?.color ?? "#6366f1";
  const dominantEmo    = dominant(emotionLog);
  const dominantMeta   = EMOTION_META[dominantEmo] ?? EMOTION_META.neutral;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={user ? "app-shell" : ""}
      style={!user ? {
        minHeight:"100vh",
        background:`radial-gradient(ellipse at 65% 0%, ${ambientColor}1a 0%, var(--bg-page, #f8fafc) 55%)`,
        transition:"background 1.8s ease",
      } : {}}
    >
      {user ? <Navbar /> : (
        <header style={{ position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", height:54, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(8px)", borderBottom:"1px solid #e5e7eb", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🎬</div>
            <span style={{ fontWeight:700, fontSize:16 }}>Emo<span style={{ color:"#6366f1" }}>Harmony</span><span style={{ fontWeight:400, color:"#94a3b8", fontSize:13, marginLeft:8 }}>· Emotional Reels</span></span>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Link to="/login" style={{ padding:"6px 16px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", color:"#374151", fontSize:13, fontWeight:600, textDecoration:"none" }}>Sign In</Link>
            <Link to="/register" style={{ padding:"6px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:600, textDecoration:"none" }}>Get Started</Link>
          </div>
        </header>
      )}

      {/* Hidden camera */}
      <video ref={camRef} autoPlay playsInline muted style={{ position:"fixed", opacity:0, pointerEvents:"none", width:1, height:1, top:-9999 }} />

      {/* Session Report Modal */}
      {showReport && (
        <SessionReport
          onClose={() => setShowReport(false)}
          reelCount={reelCount}
          allEmotions={allEmotions}
          likedReels={likedReels}
          sessionSeconds={sessionSeconds}
        />
      )}

      <div className={user ? "app-main page-enter" : ""} style={!user ? { padding:"24px 32px", maxWidth:1200, margin:"0 auto" } : {}}>

        {/* Top bar */}
        <div className="app-topbar">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${ambientColor},#ec4899)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0, transition:"background 1.5s ease" }}>🎬</div>
            <div>
              <span style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>Emotional Reels</span>
              <span style={{ fontSize:13, color:"var(--text-muted)", marginLeft:8 }}>· AI-Powered Feed</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:modelsLoaded?(cameraOn?"#dcfce7":"#f0fdf4"):"var(--bg-subtle)", border:`1px solid ${modelsLoaded?(cameraOn?"#86efac":"#bbf7d0"):"var(--border)"}`, fontSize:12, fontWeight:600, color:modelsLoaded?(cameraOn?"#15803d":"#166534"):"var(--text-muted)" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:modelsLoaded?(cameraOn?"#22c55e":"#86efac"):"#e5e7eb", display:"inline-block", animation:cameraOn?"pulse 1.5s infinite":"none" }} />
              {!modelsLoaded ? `Loading AI… (${loadStep}/3)` : cameraOn ? "Emotion AI Active" : "AI Ready"}
            </div>
            {!showMoodPicker && (
              <>
                <button onClick={() => setShowMoodPicker(true)} style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600, border:"1px solid var(--border)", background:"var(--bg-surface)", color:"var(--text-secondary)", cursor:"pointer" }}>🎯 Change Goal</button>
                <button onClick={() => setShowReport(true)} style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600, border:"none", background:"linear-gradient(135deg,#f43f5e,#ec4899)", color:"#fff", cursor:"pointer" }}>📊 Session Report</button>
              </>
            )}
          </div>
        </div>

        <div className="app-content">

          {/* Mood Picker */}
          {showMoodPicker && (
            <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:16, padding:"32px 28px", textAlign:"center", maxWidth:560, margin:"0 auto 24px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
              <div style={{ fontSize:20, fontWeight:800, color:"var(--text-primary)", marginBottom:6 }}>How do you want to feel?</div>
              <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:24 }}>The AI curates your reel feed using real-time facial emotion detection.</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                {MOOD_GOALS.map(g => (
                  <button key={g.key} onClick={() => handleStartWatching(g.key)}
                    style={{ padding:"16px 14px", borderRadius:12, border:"1.5px solid var(--border)", background:"var(--bg-subtle)", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background="linear-gradient(135deg,rgba(244,63,94,0.08),rgba(236,72,153,0.08))"; e.currentTarget.style.borderColor="#f43f5e"; e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="var(--bg-subtle)"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="translateY(0)"; }}
                  >
                    <div style={{ fontSize:20, marginBottom:4 }}>{g.label}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>{g.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)" }}>🔒 All emotion detection runs 100% in your browser. No video data is ever uploaded.</div>
            </div>
          )}

          {/* Palate Cleanse Banner */}
          {paletteCleanse && (
            <div style={{ background:"linear-gradient(135deg,#0d9488,#0891b2)", color:"#fff", borderRadius:10, padding:"10px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:10, fontSize:13, fontWeight:600, animation:"slideDown 0.4s ease" }}>
              <span style={{ fontSize:20 }}>🌿</span>
              <div>
                <div>Palate Cleanser Activated</div>
                <div style={{ fontSize:11, fontWeight:400, opacity:0.85 }}>We detected a negative mood. Switching to a calming reel to help you reset.</div>
              </div>
            </div>
          )}

          {/* Main layout */}
          {!showMoodPicker && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20, alignItems:"start" }}>

              {/* Left: Video + controls */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Video with ambient glow */}
                <div style={{ position:"relative" }}>
                  <div style={{ position:"absolute", inset:-10, borderRadius:26, background:`radial-gradient(ellipse, ${ambientColor}28 0%, transparent 70%)`, transition:"background 1.8s ease", pointerEvents:"none", zIndex:0 }} />
                  <div style={{ background:"#000", borderRadius:16, overflow:"hidden", position:"relative", aspectRatio:"16/9", border:`1.5px solid ${ambientColor}50`, transition:"border-color 1.8s ease", zIndex:1 }}>

                    {/* Transition overlay */}
                    {transitioning && <div style={{ position:"absolute", inset:0, background:"#000", zIndex:10, opacity:0.9 }} />}

                    <iframe
                      key={`${currentReel.id}-${isMuted}`}
                      ref={videoRef}
                      src={`https://www.youtube.com/embed/${currentReel.videoId}?autoplay=1&loop=1&playlist=${currentReel.videoId}&mute=${isMuted?1:0}&controls=0&rel=0&modestbranding=1&playsinline=1`}
                      title={currentReel.title}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none", display:"block", opacity:transitioning?0:1, transition:"opacity 0.3s ease" }}
                    />

                    {/* Info overlay */}
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", padding:"48px 18px 64px", color:"#fff", zIndex:2, pointerEvents:"none" }}>
                      <div style={{ fontSize:11, opacity:0.7, marginBottom:2 }}>{currentReel.creator}</div>
                      <div style={{ fontSize:16, fontWeight:700 }}>{currentReel.title}</div>
                      <div style={{ fontSize:12, opacity:0.8, marginTop:4 }}>{currentReel.desc}</div>
                    </div>

                    {/* Like / Dislike — bottom right */}
                    <div style={{ position:"absolute", bottom:14, right:14, display:"flex", flexDirection:"column", gap:8, zIndex:3 }}>
                      <button onClick={handleLike} title="Like" style={{ width:44, height:44, borderRadius:"50%", border:"none", background:likedIds.includes(currentReel.id)?"#22c55e":"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", transform:likedIds.includes(currentReel.id)?"scale(1.18)":"scale(1)", boxShadow:likedIds.includes(currentReel.id)?"0 4px 14px rgba(34,197,94,0.4)":"none" }}>👍</button>
                      <button onClick={handleDislike} title="Dislike & Skip" style={{ width:44, height:44, borderRadius:"50%", border:"none", background:dislikedIds.includes(currentReel.id)?"#ef4444":"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>👎</button>
                    </div>

                    {/* Live emotion badge — top right */}
                    {currentEmo && (
                      <div style={{ position:"absolute", top:12, right:12, background:"rgba(0,0,0,0.72)", backdropFilter:"blur(8px)", color:currentEmo.color, border:`1px solid ${currentEmo.color}55`, padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:5, zIndex:3 }}>
                        <span>{currentEmo.emoji}</span>
                        <span style={{ color:"#fff" }}>{currentEmo.label}</span>
                        <span style={{ fontSize:10, color:currentEmo.color }}>{currentEmo.conf}%</span>
                      </div>
                    )}

                    {/* Mute — top left */}
                    <button onClick={() => setIsMuted(m => !m)} style={{ position:"absolute", top:12, left:12, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)", color:"#fff", border:"none", cursor:"pointer", padding:"6px 12px", borderRadius:20, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:5, zIndex:3 }}>
                      {isMuted ? "🔇 Unmute" : "🔊 Mute"}
                    </button>

                    {/* Reel badge — bottom left */}
                    <div style={{ position:"absolute", bottom:14, left:14, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", color:"#fff", padding:"4px 10px", borderRadius:16, fontSize:11, fontWeight:600, zIndex:3 }}>
                      #{reelCount} · {currentReel.tag}
                    </div>
                  </div>
                </div>

                {/* Controls row */}
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={goNextReel}
                    style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#f43f5e,#ec4899)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 3px 12px rgba(244,63,94,0.35)", transition:"opacity 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
                    onMouseLeave={e => e.currentTarget.style.opacity="1"}
                  >⏭ Next Reel</button>
                  <button onClick={() => setShowAnalytics(s => !s)} style={{ padding:"11px 18px", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg-surface)", color:"var(--text-primary)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    {showAnalytics ? "▲ Hide" : "📈 Analytics"}
                  </button>
                </div>

                {/* Mini sparkline — always visible once data exists */}
                {analyticsData.length >= 2 && (
                  <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:12, padding:"10px 14px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span>📊 Live Emotion Confidence</span>
                      {currentEmo && <span style={{ color:currentEmo.color, fontWeight:700 }}>{currentEmo.emoji} {currentEmo.label} · {currentEmo.conf}%</span>}
                    </div>
                    <ResponsiveContainer width="100%" height={55}>
                      <LineChart data={analyticsData} margin={{ left:0, right:4, top:2, bottom:0 }}>
                        <Line type="monotone" dataKey="score" stroke={ambientColor} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Expanded analytics chart */}
                {showAnalytics && (
                  <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, padding:"20px 20px 16px", animation:"slideDown 0.3s ease" }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)", marginBottom:4 }}>📈 Creator Emotion Analytics</div>
                    <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:16 }}>Real-time viewer emotion confidence. At which second are viewers happiest?</div>
                    {analyticsData.length > 2 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={analyticsData} margin={{ left:0, right:10, top:4, bottom:0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="t" tickFormatter={v => `${v}s`} tick={{ fontSize:11, fill:"var(--text-muted)" }} axisLine={false} />
                          <YAxis domain={[0,100]} tickFormatter={v => `${v}%`} tick={{ fontSize:11, fill:"var(--text-muted)" }} width={38} axisLine={false} />
                          <Tooltip formatter={(value, _n, props) => [`${value}%`, props.payload.emotion]} labelFormatter={v => `${v}s into reel`} contentStyle={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:8, fontSize:12 }} />
                          <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" label={{ value:"High", fill:"#22c55e", fontSize:10 }} />
                          <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:"#ec4899", strokeWidth:0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height:120, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", fontSize:13, gap:8 }}>
                        <span style={{ fontSize:24 }}>👁️</span> Keep watching — data populates as you view the reel
                      </div>
                    )}
                  </div>
                )}

                {/* Manual emotion chips (when camera is off) */}
                {!cameraOn && <ManualEmotionChips onSelect={handleManualEmo} current={manualEmo} />}

              </div>

              {/* Right sidebar */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Session stats */}
                <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:14, padding:"16px 18px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>Session Stats</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <StatPill label="Reels" value={reelCount} />
                    <StatPill label="Liked 👍" value={likedIds.length} color="#22c55e" />
                    <StatPill label="Mood Goal" value={MOOD_GOALS.find(g => g.key === moodGoalKey)?.label || "Any"} />
                    <StatPill label="Your Emotion" value={currentEmo ? `${currentEmo.emoji} ${currentEmo.label}` : "—"} color={currentEmo?.color} />
                  </div>
                </div>

                {/* Live emotion card */}
                <div style={{ background:"var(--bg-surface)", border:`1px solid ${currentEmo ? currentEmo.color + "40" : "var(--border)"}`, borderRadius:14, padding:"20px 18px", textAlign:"center", transition:"border-color 1s ease" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:14 }}>Your Real-Time Emotion</div>
                  {currentEmo ? (
                    <>
                      <div style={{ fontSize:52, lineHeight:1, marginBottom:8 }}>{currentEmo.emoji}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:currentEmo.color }}>{currentEmo.label}</div>
                      <div style={{ marginTop:8, fontSize:13, background:`${currentEmo.color}1a`, color:currentEmo.color, borderRadius:20, padding:"3px 14px", display:"inline-block", fontWeight:600 }}>{currentEmo.conf}% confidence</div>
                      {manualEmo && !cameraOn && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:6 }}>✋ Manually set</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:42, marginBottom:8, opacity:0.4 }}>😶</div>
                      <div style={{ fontSize:13, color:"var(--text-muted)" }}>{cameraOn ? "Reading your expression…" : "Use chips below to set your mood"}</div>
                    </>
                  )}
                </div>

                {/* Dominant emotion for this reel */}
                {emotionLog.length >= 3 && (
                  <div style={{ background:`${dominantMeta.color}10`, border:`1px solid ${dominantMeta.color}40`, borderRadius:14, padding:"14px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Dominant So Far</div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:28 }}>{dominantMeta.emoji}</span>
                      <div>
                        <div style={{ fontWeight:700, color:dominantMeta.color, fontSize:15 }}>{dominantMeta.label}</div>
                        <div style={{ fontSize:11, color:"var(--text-muted)" }}>Most common while watching</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Up Next AI pick */}
                <UpNextCard reel={upNextReel} />

                {/* How it works */}
                <div style={{ background:"var(--bg-subtle)", border:"1px solid var(--border)", borderRadius:14, padding:"16px 18px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", marginBottom:10 }}>🤖 How the AI Works</div>
                  {[
                    { icon:"📷", text:"Invisible webcam detects micro-expressions every 0.8s." },
                    { icon:"🧠", text:"Face-API.js classifies your emotion locally in-browser." },
                    { icon:"⚙️", text:"Recommendation engine picks next reel based on emotion + mood goal." },
                    { icon:"🌿", text:"Negative spiral? Auto-inserts a calming palate cleanser." },
                    { icon:"👍", text:"Liked reels get boosted in future recommendations." },
                  ].map((item, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                      <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
                      <span style={{ fontSize:11, color:"var(--text-secondary)", lineHeight:1.5 }}>{item.text}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:8, padding:"8px 10px", background:"var(--bg-surface)", borderRadius:8, fontSize:11, color:"var(--text-muted)", display:"flex", gap:6 }}>
                    🔒 All processing is 100% local. No video is uploaded.
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 768px) {
          .app-content > div[style*="grid-template-columns"] {
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmotionalReels;

