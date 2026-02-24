import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

const MODEL_INFO = {
  SVM: { name: "Support Vector Machine", acc: "82.3%", speed: "Fast", icon: "⚡", desc: "Best for quick real-time analysis" },
  CNN: { name: "Convolutional Neural Network", acc: "87.1%", speed: "Medium", icon: "🧬", desc: "Higher accuracy, temporal pattern detection" },
  LSTM: { name: "Long Short-Term Memory", acc: "89.4%", speed: "Slower", icon: "🔄", desc: "Best for sequential EEG modeling" },
};

const Upload = () => {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [model, setModel] = useState("SVM");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");

  const ALLOWED = [".csv", ".edf", ".mat", ".txt"];

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  };
  const handleFileInput = (e) => { if (e.target.files[0]) validateAndSetFile(e.target.files[0]); };

  const validateAndSetFile = (f) => {
    setError("");
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError(`Invalid format. Allowed: ${ALLOWED.join(", ")}`);
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size: 50MB");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError("Please select an EEG file"); return; }
    setLoading(true); setProgress(0); setError("");

    const stages = ["Uploading file...", "Removing artifacts...", "Extracting band powers...", "Running ML model...", "Generating results..."];
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
    <div className="min-h-screen bg-neuro">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 page-enter">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">EEG Analysis</h1>
          <p className="text-slate-400 mt-1">Upload your EEG data and let our AI detect your emotional state</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop Zone */}
          <div className="glass-card p-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => !file && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-indigo-400 bg-indigo-500/10" :
                  file ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/15 hover:border-indigo-500/50 hover:bg-white/[0.02]"
                }`}
            >
              {file ? (
                <div>
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-emerald-400 font-semibold">{file.name}</p>
                  <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB · {file.name.split(".").pop().toUpperCase()}</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-3 text-xs text-slate-400 hover:text-rose-400 underline">Remove file</button>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4">📂</div>
                  <p className="text-white font-semibold text-lg">Drop EEG file here or click to browse</p>
                  <p className="text-slate-500 text-sm mt-2">Supported: CSV, EDF, MAT, TXT · Max 50MB</p>
                  <input ref={fileRef} type="file" accept=".csv,.edf,.mat,.txt" onChange={handleFileInput} className="hidden" />
                </div>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Select ML Model</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(MODEL_INFO).map(([key, m]) => (
                <button key={key} type="button" onClick={() => setModel(key)}
                  className={`p-4 rounded-xl text-left border transition-all ${model === key ? "border-indigo-500 bg-indigo-500/15" : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}>
                  <div className="text-2xl mb-2">{m.icon}</div>
                  <div className="text-sm font-semibold text-white">{key}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.name}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Acc: {m.acc}</span>
                    <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">{m.speed}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Progress Indicator */}
          {loading && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-0.5 items-end h-6">
                  {[6, 10, 14, 10, 6].map((h, i) => (
                    <div key={i} className="wave-bar" style={{ height: `${h}px`, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-white font-medium text-sm">{stage}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Processing EEG signal...</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !file} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3">
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
            ) : (
              <><span>🧠</span> Analyze EEG Data</>
            )}
          </button>
        </form>

        {/* Info box */}
        <div className="mt-6 glass p-4 text-sm text-slate-400">
          <p className="font-medium text-slate-300 mb-1">💡 How to prepare your EEG data</p>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>Export CSV with columns = EEG channels, rows = time samples</li>
            <li>Ensure consistent sampling rate (128 Hz recommended)</li>
            <li>At least 5 seconds of data required for reliable analysis</li>
            <li>Compatible with Emotiv EPOC, OpenBCI, Muse, NeuroSky exports</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Upload;
