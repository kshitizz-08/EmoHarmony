import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

/** Public EEG datasets available for demo analysis */
const PUBLIC_DATASETS = [
    {
        id: "deap",
        name: "DEAP Dataset",
        description: "Database for Emotion Analysis using Physiological signals. 32 participants, 40 EEG channels, music video stimuli. Most widely used EEG emotion dataset.",
        subjects: 32, channels: 32, samplingRate: 128, format: "MAT",
        emotions: ["Valence", "Arousal", "Dominance", "Liking"],
        source: "Queen Mary University of London",
        icon: "🎵",
        badge: "Most Popular",
        badgeColor: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    },
    {
        id: "seed",
        name: "SEED Dataset",
        description: "SJTU Emotion EEG Dataset. 15 subjects watch movie clips designed to elicit positive, neutral, and negative emotional states. 62-channel EEG.",
        subjects: 15, channels: 62, samplingRate: 200, format: "MAT",
        emotions: ["Positive", "Neutral", "Negative"],
        source: "Shanghai Jiao Tong University",
        icon: "🎬",
        badge: "Research Grade",
        badgeColor: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    },
    {
        id: "mahnob",
        name: "MAHNOB-HCI Dataset",
        description: "Multimodal affect recognition dataset with synchronized EEG and facial expressions. Film clip stimuli with valence and arousal annotations.",
        subjects: 27, channels: 32, samplingRate: 256, format: "BDF",
        emotions: ["Valence", "Arousal"],
        source: "Imperial College London",
        icon: "😊",
        badge: "Multimodal",
        badgeColor: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
    },
    {
        id: "dreamer",
        name: "DREAMER Dataset",
        description: "EEG and ECG recorded during audio-visual stimuli for emotion elicitation. Affordable 14-channel Emotiv EPOC headset compatible data.",
        subjects: 23, channels: 14, samplingRate: 128, format: "MAT",
        emotions: ["Valence", "Arousal", "Dominance"],
        source: "Aristotle University",
        icon: "🎧",
        badge: "Emotiv Compatible",
        badgeColor: "text-purple-300 bg-purple-500/10 border-purple-500/30",
    },
    {
        id: "amigos",
        name: "AMIGOS Dataset",
        description: "A dataset for Affect, Personality and Mood research on Individuals and Groups. Short and long music video stimuli, 14-channel EEG.",
        subjects: 40, channels: 14, samplingRate: 128, format: "MAT",
        emotions: ["Valence", "Arousal", "Dominance", "Familiarity"],
        source: "University of Granada",
        icon: "👥",
        badge: "Group Study",
        badgeColor: "text-rose-300 bg-rose-500/10 border-rose-500/30",
    },
    {
        id: "synthetic",
        name: "Synthetic EEG (Demo)",
        description: "Procedurally generated realistic EEG signal using physiologically-plausible frequency components (delta through gamma). Perfect for testing the pipeline.",
        subjects: 1, channels: 14, samplingRate: 128, format: "Generated",
        emotions: ["Happy", "Calm", "Stress", "Sad", "Angry"],
        source: "EmoHarmony Platform",
        icon: "🤖",
        badge: "Always Available",
        badgeColor: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
    },
];

const Repository = () => {
    const navigate = useNavigate();
    const [analyzing, setAnalyzing] = useState(null);
    const [model, setModel] = useState("SVM");
    const [error, setError] = useState("");

    const handleAnalyze = async (dataset) => {
        setAnalyzing(dataset.id);
        setError("");
        try {
            // Send a "virtual" upload request; ML service generates synthetic EEG
            const formData = new FormData();
            // Create a tiny placeholder blob so multer accepts it
            const blob = new Blob([`# ${dataset.name} demo EEG\nch1,ch2,ch3\n`], { type: "text/plain" });
            formData.append("file", blob, `${dataset.id}_demo.csv`);
            formData.append("modelType", model);
            formData.append("description", `Public dataset: ${dataset.name}`);
            const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
            navigate(`/results/${res.data.result._id}`);
        } catch (err) {
            setError(err.response?.data?.error || "Analysis failed. Please try again.");
        } finally {
            setAnalyzing(null);
        }
    };

    return (
        <div className="min-h-screen bg-neuro">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">EEG Dataset Repository</h1>
                    <p className="text-slate-400 mt-1">Analyze pre-loaded public EEG datasets without uploading your own data</p>
                </div>

                {/* Model Selector */}
                <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
                    <span className="text-slate-300 text-sm font-medium">Select ML Model:</span>
                    {["SVM", "CNN", "LSTM"].map((m) => (
                        <button key={m} onClick={() => setModel(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${model === m ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" : "border-white/10 text-slate-400 hover:border-white/20"
                                }`}>
                            {m}
                        </button>
                    ))}
                    <span className="ml-auto text-xs text-slate-500">Model used for all demo analyses</span>
                </div>

                {error && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        ⚠️ {error}
                    </div>
                )}

                {/* Dataset Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {PUBLIC_DATASETS.map((ds) => (
                        <div key={ds.id} className="glass-card p-6 flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="text-3xl">{ds.icon}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ds.badgeColor}`}>
                                    {ds.badge}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white">{ds.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{ds.source}</p>
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed flex-1">{ds.description}</p>

                            {/* Metadata grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    ["Subjects", ds.subjects],
                                    ["Channels", ds.channels],
                                    ["Fs (Hz)", ds.samplingRate],
                                ].map(([label, val]) => (
                                    <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                                        <div className="text-white font-semibold text-sm">{val}</div>
                                        <div className="text-slate-500 text-xs">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Emotion labels */}
                            <div className="flex flex-wrap gap-1">
                                {ds.emotions.map((e) => (
                                    <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/8">
                                        {e}
                                    </span>
                                ))}
                            </div>

                            {/* Format */}
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Format: <span className="text-slate-300">{ds.format}</span></span>
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => handleAnalyze(ds)}
                                disabled={!!analyzing}
                                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                            >
                                {analyzing === ds.id ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
                                ) : (
                                    <><span>🧠</span> Analyze with {model}</>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Info notice */}
                <div className="mt-8 glass p-4 text-sm text-slate-400 text-center rounded-xl">
                    💡 Demo analyses use synthetic EEG signals generated with physiologically-realistic frequency components.
                    For full accuracy, <a href="/upload" className="text-indigo-400 hover:underline">upload your own EEG data</a>.
                </div>
            </main>
        </div>
    );
};

export default Repository;
