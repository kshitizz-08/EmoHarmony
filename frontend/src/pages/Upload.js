import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

const MODEL_INFO = {
  AUTO: { name: "Ensemble (Best 3)", acc: "~94%", speed: "Thorough", icon: "🏆", desc: "SVM + XGBoost + LightGBM — highest accuracy" },
  XGB: { name: "XGBoost", acc: "~92%", speed: "Fast", icon: "⚡", desc: "Gradient boosting — best single model for tabular EEG" },
  LGBM: { name: "LightGBM", acc: "~92%", speed: "Fast", icon: "🚀", desc: "Light gradient boosting — fast & accurate" },
  SVM: { name: "Support Vector Machine", acc: "94.45%", speed: "Fast", icon: "🔬", desc: "Classic ML baseline, reliable & interpretable" },
};

const Upload = () => {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [model, setModel] = useState("AUTO");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");

  const ALLOWED = [".csv", ".edf", ".mat", ".txt"];

  const validateAndSetFile = (f) => {
    setError("");
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) { setError(`Invalid format. Allowed: ${ALLOWED.join(", ")}`); return; }
    if (f.size > 50 * 1024 * 1024) { setError("File too large. Maximum size: 50MB"); return; }
    setFile(f);
  };

  const handleFileDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) validateAndSetFile(f); };
  const handleFileInput = (e) => { if (e.target.files[0]) validateAndSetFile(e.target.files[0]); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError("Please select an EEG file"); return; }
    setLoading(true); setProgress(0); setError("");

    const stages = ["Uploading file…", "Removing artifacts…", "Extracting band powers…", "Running ML model…", "Generating results…"];
    let si = 0;
    const stageTimer = setInterval(() => {
      if (si < stages.length) { setStage(stages[si]); setProgress(Math.min((si + 1) * 18, 85)); si++; }
      else clearInterval(stageTimer);
    }, 800);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modelType", model);
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      clearInterval(stageTimer);
      setProgress(100); setStage("Complete!");
      setTimeout(() => navigate(`/results/${res.data.result._id}`), 600);
    } catch (err) {
      clearInterval(stageTimer);
      setError(err.response?.data?.error || "Upload failed. Please try again.");
      setLoading(false); setProgress(0); setStage("");
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-main page-enter">

        {/* Top bar */}
        <div className="app-topbar">
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Analyze EEG</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>· Upload and detect your emotional state</span>
          </div>
        </div>

        <div className="app-content">


          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Drop zone */}
            <div className="card">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => !file && fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "var(--accent)" : file ? "var(--accent-border)" : "var(--border)"}`,
                  borderRadius: 10, padding: "40px 24px", textAlign: "center", cursor: file ? "default" : "pointer",
                  background: dragOver ? "var(--accent-light)" : file ? "var(--accent-light)" : "var(--bg-page)",
                  transition: "all 0.15s",
                }}
              >
                {file ? (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                    <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{file.name}</p>
                    <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB · {file.name.split(".").pop().toUpperCase()}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ marginTop: 10, fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 6 }}>Drop your EEG file here or click to browse</p>
                    <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Supported: CSV, EDF, MAT, TXT · Max 50MB</p>
                    <input id="upload-nav-link" ref={fileRef} type="file" accept=".csv,.edf,.mat,.txt" onChange={handleFileInput} style={{ display: "none" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Model selection */}
            <div className="card">
              <div className="card-header">
                <span className="card-title" id="model-selector">Select ML Model</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>AUTO is recommended</span>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, alignItems: "stretch" }}>
                  {Object.entries(MODEL_INFO).map(([key, m]) => (
                    <button key={key} type="button" onClick={() => setModel(key)}
                      style={{
                        padding: "14px 12px", borderRadius: 8, textAlign: "left", cursor: "pointer",
                        border: model === key ? `1.5px solid var(--accent)` : "1px solid var(--border)",
                        background: model === key ? "var(--accent-light)" : "var(--bg-surface)",
                        transition: "all 0.15s",
                        display: "flex", flexDirection: "column", gap: 0,
                      }}>
                      {/* Icon */}
                      <div style={{ fontSize: 18, marginBottom: 8, lineHeight: 1 }}>{m.icon}</div>
                      {/* Key label */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{key}</div>
                      {/* Full name */}
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.4, minHeight: 30 }}>{m.name}</div>
                      {/* Accuracy badge */}
                      <span style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 999, alignSelf: "flex-start",
                        background: model === key ? "var(--accent)" : "var(--bg-subtle)",
                        color: model === key ? "#fff" : "var(--text-secondary)",
                        fontWeight: 600, marginBottom: 8,
                      }}>{m.acc}</span>
                      {/* Description — pushed to bottom */}
                      <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55, marginTop: "auto" }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="alert-error">⚠️ {error}</div>}

            {/* Progress */}
            {loading && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{stage}</span>
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Processing EEG signal…</p>
              </div>
            )}

            <button id="analyze-button" type="submit" disabled={loading || !file} className="btn-primary"
              style={{ padding: "11px 20px", justifyContent: "center", fontSize: 14 }}>
              {loading ? "Analyzing…" : "🧠 Analyze EEG Data"}
            </button>
          </form>

          {/* Tips */}
          <div className="card" style={{ marginTop: 16, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>💡 How to prepare your EEG data</p>
            <ul style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Export CSV with columns = EEG channels, rows = time samples</li>
              <li>Ensure consistent sampling rate (128 Hz recommended)</li>
              <li>At least 5 seconds of data required for reliable analysis</li>
              <li>Compatible with Emotiv EPOC, OpenBCI, Muse, NeuroSky exports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
