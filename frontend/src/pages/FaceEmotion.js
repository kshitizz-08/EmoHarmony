/**
 * EmoHarmony - Real-Time Face Emotion Detection
 * Uses face-api.js (TensorFlow.js) to detect facial expressions live from webcam.
 * Runs 100% in-browser — no data sent to any server.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import Navbar from "../components/Navbar";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS_URL = "/models";

const EMOTION_META = {
  happy:     { label: "Happy",     emoji: "😊", color: "#22c55e" },
  calm:      { label: "Calm",      emoji: "😌", color: "#0d9488" },
  neutral:   { label: "Neutral",   emoji: "😐", color: "#94a3b8" },
  surprised: { label: "Surprised", emoji: "😮", color: "#f59e0b" },
  sad:       { label: "Sad",       emoji: "😢", color: "#6366f1" },
  fearful:   { label: "Fearful",   emoji: "😨", color: "#a855f7" },
  disgusted: { label: "Disgusted", emoji: "🤢", color: "#84cc16" },
  angry:     { label: "Angry",     emoji: "😠", color: "#ef4444" },
};

const DETECTION_INTERVAL_MS = 200;
const TIMELINE_MAX_POINTS   = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function topEmotion(expressions) {
  return Object.entries(expressions).sort((a, b) => b[1] - a[1])[0];
}

function expressionsToBarData(expressions) {
  return Object.entries(expressions)
    .map(([key, val]) => ({
      name:  EMOTION_META[key]?.label ?? key,
      value: Math.round(val * 100),
      color: EMOTION_META[key]?.color ?? "#888",
      emoji: EMOTION_META[key]?.emoji ?? "",
    }))
    .sort((a, b) => b.value - a.value);
}

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 13,
    }}>
      <span style={{ fontSize: 18 }}>{d.emoji}</span>{" "}
      <strong style={{ color: "var(--text-primary)" }}>{d.name}</strong>:{" "}
      <span style={{ color: d.color }}>{d.value}%</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FaceEmotion = () => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef   = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [frozen,       setFrozen]       = useState(false);
  const [error,        setError]        = useState(null);
  const [loadingMsg,   setLoadingMsg]   = useState("Loading AI models…");
  const [loadStep,     setLoadStep]     = useState(0); // 0→1→2→3 for progress bar

  const [barData,      setBarData]      = useState([]);
  const [topEmo,       setTopEmo]       = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [frameCount,   setFrameCount]   = useState(0);
  const [sessionStart]                  = useState(Date.now());
  const [timeline,     setTimeline]     = useState([]);

  // ─── 1. Load models ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMsg("Loading face detector…"); setLoadStep(1);
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);

        if (cancelled) return;
        setLoadingMsg("Loading landmark model…"); setLoadStep(2);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL);

        if (cancelled) return;
        setLoadingMsg("Loading expression model…"); setLoadStep(3);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL);

        if (!cancelled) { setModelsLoaded(true); setLoadingMsg(""); }
      } catch (err) {
        if (!cancelled) setError("Failed to load AI models: " + err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── 2. Camera ───────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Sync canvas dimensions as soon as video dimensions are known
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width  = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(loopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    setFrozen(false);
    setFaceDetected(false);
    setBarData([]);
    setTopEmo(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── 3. Detection loop ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return;

    const detect = async () => {
      if (frozen) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceExpressions();

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!detection) { setFaceDetected(false); return; }

      // Adjust expression scores to penalize "neutral" bias
      const adjustedExpressions = { ...detection.expressions };
      if (adjustedExpressions.neutral !== undefined) {
        adjustedExpressions.neutral *= 0.2;
      }
      const totalScore = Object.values(adjustedExpressions).reduce((sum, score) => sum + score, 0);
      if (totalScore > 0) {
        for (const key in adjustedExpressions) {
          adjustedExpressions[key] /= totalScore;
        }
      }

      // Bounding box
      const { x, y, width, height } = detection.detection.box;
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 8);
      ctx.stroke();

      // Label pill
      const [emoKey, emoConf] = topEmotion(adjustedExpressions);
      const meta  = EMOTION_META[emoKey] ?? { label: emoKey, emoji: "🙂", color: "#888" };
      const label = `${meta.emoji} ${meta.label}  ${Math.round(emoConf * 100)}%`;
      ctx.font     = "bold 14px Inter, sans-serif";
      const textW  = ctx.measureText(label).width + 16;
      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.roundRect(x, y - 32, textW, 28, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 8, y - 13);

      // Landmarks
      ctx.fillStyle = "rgba(99,102,241,0.7)";
      detection.landmarks.positions.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      setFaceDetected(true);
      setTopEmo({ key: emoKey, conf: Math.round(emoConf * 100), ...meta });
      setBarData(expressionsToBarData(adjustedExpressions));
      setFrameCount(c => c + 1);
      setTimeline(prev => {
        const pt = { t: Math.round((Date.now() - sessionStart) / 1000), emotion: meta.label, score: Math.round(emoConf * 100) };
        return [...prev.slice(-TIMELINE_MAX_POINTS + 1), pt];
      });
    };

    loopRef.current = setInterval(detect, DETECTION_INTERVAL_MS);
    return () => clearInterval(loopRef.current);
  }, [cameraActive, modelsLoaded, frozen, sessionStart]);

  // ─── 4. Export ───────────────────────────────────────────────────────────────

  const exportSession = () => {
    const data = {
      sessionDate:     new Date().toISOString(),
      durationSec:     Math.round((Date.now() - sessionStart) / 1000),
      totalFrames:     frameCount,
      emotionTimeline: timeline,
      dominantEmotion: timeline.length
        ? Object.entries(timeline.reduce((acc, p) => { acc[p.emotion] = (acc[p.emotion] ?? 0) + 1; return acc; }, {}))
            .sort((a, b) => b[1] - a[1])[0][0]
        : "N/A",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `face-emotion-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 5. Render ───────────────────────────────────────────────────────────────

  const sessionDuration = Math.round((Date.now() - sessionStart) / 1000);

  return (
    <div className="app-shell">
      <Navbar />

      <div className="app-main page-enter">

        {/* ── Top bar ── */}
        <div className="app-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, flexShrink: 0,
            }}>🎭</div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Face Emotion Detection
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                · Live Webcam AI
              </span>
            </div>
          </div>

          {/* Top-bar action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {!cameraActive ? (
              <button
                onClick={startCamera}
                disabled={!modelsLoaded}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 7, border: "none",
                  background: modelsLoaded ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--bg-subtle)",
                  color: modelsLoaded ? "#fff" : "var(--text-muted)",
                  fontWeight: 600, fontSize: 13, cursor: modelsLoaded ? "pointer" : "not-allowed",
                  boxShadow: modelsLoaded ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                  transition: "all 0.15s",
                }}
              >
                📷 {modelsLoaded ? "Start Camera" : "Loading models…"}
              </button>
            ) : (
              <>
                <button onClick={() => setFrozen(f => !f)} style={{
                  padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)",
                  background: frozen ? "#f59e0b" : "var(--bg-surface)",
                  color: frozen ? "#fff" : "var(--text-primary)",
                }}>
                  {frozen ? "▶ Resume" : "⏸ Freeze"}
                </button>
                <button onClick={exportSession} style={{
                  padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)",
                }}>
                  💾 Export
                </button>
                <button onClick={stopCamera} style={{
                  padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626",
                }}>
                  ⏹ Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="app-content">

          {/* ── Model loading bar ── */}
          {!modelsLoaded && !error && (
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "24px 28px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ fontSize: 32 }}>⚙️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, fontSize: 14 }}>
                  {loadingMsg}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                  Downloading lightweight AI model weights (~600 KB total)
                </div>
                <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    width: `${Math.round((loadStep / 3) * 100)}%`,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  Step {loadStep} of 3
                </div>
              </div>
            </div>
          )}

          {/* ── Error banner ── */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9,
              padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>
            </div>
          )}

          {/* ── Stats strip (when active) ── */}
          {cameraActive && (
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "Status",   value: frozen ? "⏸ Frozen" : faceDetected ? "✅ Detected" : "🔍 Scanning…" },
                { label: "Frames",   value: frameCount },
                { label: "Duration", value: `${sessionDuration}s` },
                { label: "Engine",   value: "In-Browser AI" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 9, padding: "9px 16px",
                }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Main two-column grid ── */}
          {modelsLoaded && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) 360px", gap: 20, alignItems: "start" }}>

              {/* ── Left: Camera feed ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  background: cameraActive ? "#000" : "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: 14, overflow: "hidden",
                  position: "relative",
                  aspectRatio: "4/3",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: 240,
                }}>
                  {!cameraActive && (
                    <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 52, marginBottom: 10 }}>📷</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" }}>Camera not started</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Click "Start Camera" in the top bar to begin</div>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    style={{
                      width: "100%", height: "100%", objectFit: "cover",
                      display: cameraActive ? "block" : "none",
                      transform: "scaleX(-1)",
                    }}
                  />

                  <canvas
                    ref={canvasRef}
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      pointerEvents: "none",
                      transform: "scaleX(-1)",
                      display: cameraActive ? "block" : "none",
                    }}
                  />

                  {frozen && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      background: "rgba(245,158,11,0.92)", color: "#fff",
                      padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      backdropFilter: "blur(4px)",
                    }}>
                      ⏸ FROZEN
                    </div>
                  )}

                  {cameraActive && !faceDetected && !frozen && (
                    <div style={{
                      position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                      background: "rgba(0,0,0,0.65)", color: "#fff",
                      padding: "5px 14px", borderRadius: 20, fontSize: 12,
                      backdropFilter: "blur(4px)", whiteSpace: "nowrap",
                    }}>
                      🔍 No face detected — look directly at the camera
                    </div>
                  )}
                </div>

                {/* Privacy note */}
                <div style={{
                  padding: "9px 14px",
                  background: "var(--bg-subtle)", border: "1px solid var(--border)",
                  borderRadius: 8, fontSize: 12, color: "var(--text-muted)",
                  display: "flex", gap: 8, alignItems: "center",
                }}>
                  🔒 <span>All processing happens locally in your browser — no video data is ever uploaded.</span>
                </div>

                {/* Tips (when camera off) */}
                {!cameraActive && (
                  <div style={{
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: 18,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                      💡 Tips for best results
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { icon: "💡", text: "Good frontal lighting — avoid backlighting" },
                        { icon: "📐", text: "Face camera directly, avoid sharp angles" },
                        { icon: "🖥️", text: "Sit ~50 cm from the screen" },
                        { icon: "🎭", text: "Try exaggerated expressions for fun!" },
                      ].map((tip, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px",
                        }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{tip.icon}</span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right column: emotion card + bar chart ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Dominant emotion card */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "20px 24px", textAlign: "center",
                }}>
                  {topEmo ? (
                    <>
                      <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 10 }}>{topEmo.emoji}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: topEmo.color, letterSpacing: "-0.3px" }}>
                        {topEmo.label}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Confidence:</span>
                        <span style={{
                          fontWeight: 700, fontSize: 15, color: topEmo.color,
                          background: `${topEmo.color}18`, borderRadius: 6, padding: "2px 10px",
                        }}>{topEmo.conf}%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 48, marginBottom: 10, opacity: 0.5 }}>😶</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {cameraActive ? "Waiting for face detection…" : "Start camera to detect emotions"}
                      </div>
                    </>
                  )}
                </div>

                {/* Expression bar chart */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "18px 18px 12px",
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14,
                  }}>
                    Expression Scores
                  </div>

                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                        <XAxis
                          type="number" domain={[0, 100]}
                          tickFormatter={v => `${v}%`}
                          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          type="category" dataKey="name" width={72}
                          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                          axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "var(--bg-subtle)" }} />
                        <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={20}>
                          {barData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{
                      height: 240, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      color: "var(--text-muted)", fontSize: 13, gap: 8,
                    }}>
                      <span style={{ fontSize: 32 }}>📊</span>
                      Bars appear once a face is detected
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── Emotion Confidence Timeline (full width) ── */}
          {timeline.length > 2 && (
            <div style={{
              marginTop: 20,
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "20px 24px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
                📈 Emotion Confidence Timeline
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                Dominant emotion confidence over the session
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={timeline} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tickFormatter={v => `${v}s`} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={38} axisLine={false} />
                  <Tooltip
                    formatter={(value, _name, props) => [`${value}%`, props.payload.emotion]}
                    labelFormatter={v => `${v}s`}
                    contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Line
                    type="monotone" dataKey="score"
                    stroke="#6366f1" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, fill: "#8b5cf6", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FaceEmotion;
