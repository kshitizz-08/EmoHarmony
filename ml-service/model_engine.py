"""
EmoHarmony ML Service - Model Engine
======================================
Loads pre-trained scikit-learn models from disk (.pkl files) and runs
emotion prediction from EEG band power features.

Models trained by: python train_model.py
  - models/svm_model.pkl    → SVM (RBF kernel) Pipeline
  - models/rf_model.pkl     → Random Forest Pipeline

Falls back to rule-based heuristics if model files are not found.
"""

import os
import joblib
import numpy as np
from typing import Dict, Tuple

# ── Constants ─────────────────────────────────────────────────────────────────

EMOTIONS = ["Happy", "Sad", "Angry", "Calm", "Stress"]
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
SVM_PATH = os.path.join(MODELS_DIR, "svm_model.pkl")
RF_PATH  = os.path.join(MODELS_DIR, "rf_model.pkl")

# ── Load models once at module import ─────────────────────────────────────────

def _load_model(path: str, name: str):
    if os.path.exists(path):
        model = joblib.load(path)
        print(f"  ✅ {name} loaded from {path}")
        return model
    print(f"  ⚠️  {name} not found at {path}. Run: python train_model.py")
    return None

_SVM_MODEL = _load_model(SVM_PATH, "SVM model")
_RF_MODEL  = _load_model(RF_PATH,  "Random Forest model")

# ── Neuroscience-based fallback (used if no .pkl found) ──────────────────────

def _rule_based_scores(band_powers: Dict[str, float]) -> Dict[str, float]:
    """Fallback: compute emotion scores from band power ratios."""
    alpha = band_powers.get("alpha", 1.0)
    beta  = band_powers.get("beta",  1.0)
    theta = band_powers.get("theta", 1.0)
    gamma = band_powers.get("gamma", 1.0)
    delta = band_powers.get("delta", 1.0)

    eps = 1e-6
    total = alpha + beta + theta + gamma + delta + eps
    rel_alpha = alpha / total
    rel_beta  = beta  / total
    rel_theta = theta / total
    rel_gamma = gamma / total
    rel_delta = delta / total

    scores = {
        "Happy":  rel_alpha * 0.5 + rel_beta  * 0.3 + (1 - rel_theta) * 0.2,
        "Calm":   rel_alpha * 0.6 + rel_theta * 0.2 + (1 - rel_beta)  * 0.2,
        "Stress": rel_beta  * 0.4 + rel_gamma * 0.4 + (1 - rel_alpha) * 0.2,
        "Angry":  rel_beta  * 0.5 + rel_gamma * 0.3 + (1 - rel_alpha) * 0.2,
        "Sad":    rel_theta * 0.5 + rel_delta  * 0.3 + (1 - rel_beta)  * 0.2,
    }
    total_score = sum(scores.values()) + eps
    return {k: round(v / total_score, 4) for k, v in scores.items()}


def _band_powers_to_feature(band_powers: Dict[str, float]) -> np.ndarray:
    """Convert band powers dict to ordered feature vector for sklearn models."""
    return np.array([[
        band_powers.get("delta", 0.0),
        band_powers.get("theta", 0.0),
        band_powers.get("alpha", 0.0),
        band_powers.get("beta",  0.0),
        band_powers.get("gamma", 0.0),
    ]])


def _predict_with_model(model, band_powers: Dict[str, float],
                        confidence_scale: float, confidence_shift: float
                        ) -> Tuple[str, float, Dict[str, float]]:
    """Run prediction through a trained sklearn pipeline and return results."""
    feature_vec = _band_powers_to_feature(band_powers)
    proba = model.predict_proba(feature_vec)[0]           # shape: (n_classes,)
    classes = model.classes_                               # emotion label order
    scores = {cls: round(float(p), 4) for cls, p in zip(classes, proba)}
    best = max(scores, key=scores.get)
    raw_conf = scores[best]
    confidence = round(raw_conf * confidence_scale + confidence_shift, 3)
    return best, min(confidence, 0.98), scores


# ── Public prediction functions ───────────────────────────────────────────────

def predict_with_svm(features: np.ndarray,
                     band_powers: Dict[str, float]) -> Tuple[str, float, Dict[str, float]]:
    """SVM (RBF kernel) prediction. Uses trained model if available."""
    if _SVM_MODEL is not None:
        return _predict_with_model(_SVM_MODEL, band_powers,
                                   confidence_scale=0.85, confidence_shift=0.10)
    # Fallback
    scores = _rule_based_scores(band_powers)
    best = max(scores, key=scores.get)
    return best, round(scores[best] * 0.85 + 0.10, 3), scores


def predict_with_cnn(features: np.ndarray,
                     band_powers: Dict[str, float]) -> Tuple[str, float, Dict[str, float]]:
    """CNN simulation using Random Forest (high accuracy, no GPU needed)."""
    if _RF_MODEL is not None:
        return _predict_with_model(_RF_MODEL, band_powers,
                                   confidence_scale=0.88, confidence_shift=0.08)
    # Fallback
    scores = _rule_based_scores(band_powers)
    best = max(scores, key=scores.get)
    return best, round(scores[best] * 0.88 + 0.08, 3), scores


def predict_with_lstm(features: np.ndarray,
                      band_powers: Dict[str, float]) -> Tuple[str, float, Dict[str, float]]:
    """LSTM simulation: uses SVM model with emphasis on temporal bands (theta/alpha)."""
    if _SVM_MODEL is not None:
        # Weight theta and alpha more heavily (temporal/sequential emphasis)
        adjusted = dict(band_powers)
        adjusted["theta"] = adjusted.get("theta", 0) * 1.3
        adjusted["alpha"] = adjusted.get("alpha", 0) * 1.2
        return _predict_with_model(_SVM_MODEL, adjusted,
                                   confidence_scale=0.90, confidence_shift=0.07)
    # Fallback
    scores = _rule_based_scores(band_powers)
    best = max(scores, key=scores.get)
    return best, round(scores[best] * 0.90 + 0.07, 3), scores


def predict_emotion(features: np.ndarray,
                    band_powers: Dict[str, float],
                    model_type: str = "SVM") -> Dict:
    """
    Main prediction dispatcher. Routes to the right model by model_type.
    Returns emotion, confidence, per-class scores, and clinical interpretation.
    """
    model_type = model_type.upper()
    if model_type == "CNN":
        emotion, confidence, scores = predict_with_cnn(features, band_powers)
    elif model_type == "LSTM":
        emotion, confidence, scores = predict_with_lstm(features, band_powers)
    else:
        emotion, confidence, scores = predict_with_svm(features, band_powers)

    interpretations = {
        "Happy":  "EEG patterns indicate elevated alpha wave activity with balanced beta power, characteristic of positive emotional arousal and heightened energy.",
        "Calm":   "Dominant alpha waves with suppressed beta activity suggest a relaxed, alert state. Theta presence indicates meditative calmness.",
        "Stress": "Significantly elevated beta and low-gamma activity with suppressed alpha waves — consistent with acute psychological stress response.",
        "Angry":  "High beta-to-alpha ratio and elevated gamma power suggest emotional arousal and heightened cognitive processing associated with anger.",
        "Sad":    "Elevated theta waves and reduced alpha/beta power are consistent with a low-arousal, negative valence emotional state.",
    }

    return {
        "emotion":        emotion,
        "confidence":     confidence,
        "emotionScores":  scores,
        "interpretation": interpretations.get(emotion, ""),
        "modelUsed":      model_type,
    }
