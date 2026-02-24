"""
EmoHarmony - Model Training Script
===================================
Generates labeled synthetic EEG data based on published neuroscience
frequency profiles for 5 emotions, extracts real band power features
using the existing features.py pipeline, then trains and saves:
  - SVM (RBF kernel)         → models/svm_model.pkl
  - Random Forest            → models/rf_model.pkl

Run once before starting the ML service:
    python train_model.py

Reference frequency profiles (neuroscience literature):
  Happy  → elevated alpha (8-13 Hz), moderate beta (13-30 Hz)
  Calm   → high alpha, low beta, some theta (4-8 Hz)
  Stress → high beta, elevated gamma (30-50 Hz), suppressed alpha
  Angry  → high beta, high gamma, low alpha
  Sad    → elevated theta, elevated delta (0.5-4 Hz), low alpha/beta
"""

import os
import joblib
import numpy as np
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score

from preprocessing import preprocess_eeg
from features import extract_band_powers

# ── Config ──────────────────────────────────────────────────────────────────
SAMPLING_RATE = 128.0       # Hz
N_SAMPLES_PER_EMOTION = 1200  # training samples per class
N_SIGNAL_SAMPLES = 1280     # ~10 seconds of EEG at 128 Hz
EMOTIONS = ["Happy", "Calm", "Stress", "Angry", "Sad"]
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Emotion-specific frequency amplitude profiles (μV)
# Based on: Koelstra et al. 2012, Nie et al. 2011, Jenke et al. 2014
EMOTION_PROFILES = {
    "Happy": {
        "delta": (1.0, 3.0),
        "theta": (1.0, 3.0),
        "alpha": (6.0, 14.0),   # HIGH alpha - positive valence
        "beta":  (2.0, 6.0),    # moderate beta - arousal
        "gamma": (0.5, 2.0),
    },
    "Calm": {
        "delta": (1.0, 3.0),
        "theta": (2.0, 5.0),    # some theta - meditative
        "alpha": (8.0, 16.0),   # HIGHEST alpha - very relaxed
        "beta":  (0.5, 2.5),    # LOW beta - not stressed
        "gamma": (0.3, 1.0),
    },
    "Stress": {
        "delta": (1.0, 3.0),
        "theta": (1.0, 3.5),
        "alpha": (1.0, 4.0),    # LOW alpha - cognitive load
        "beta":  (5.0, 12.0),   # HIGH beta - stress marker
        "gamma": (3.0, 8.0),    # HIGH gamma - high arousal
    },
    "Angry": {
        "delta": (1.0, 3.5),
        "theta": (1.0, 3.0),
        "alpha": (1.0, 3.5),    # LOW alpha - negative emotion
        "beta":  (5.0, 11.0),   # HIGH beta - arousal
        "gamma": (4.0, 9.0),    # HIGH gamma - intense arousal
    },
    "Sad": {
        "delta": (3.0, 8.0),    # HIGH delta - low consciousness state
        "theta": (3.0, 7.0),    # HIGH theta - drowsiness/withdrawal
        "alpha": (1.0, 4.0),    # LOW alpha
        "beta":  (0.5, 2.0),    # LOW beta - low energy
        "gamma": (0.3, 1.0),
    },
}

BAND_FREQS = {
    "delta": (1.0, 3.0),
    "theta": (5.0, 7.0),
    "alpha": (10.0, 12.0),
    "beta":  (18.0, 25.0),
    "gamma": (35.0, 42.0),
}


def generate_eeg_for_emotion(emotion: str, n_samples: int = N_SIGNAL_SAMPLES) -> np.ndarray:
    """
    Generate a single EEG signal sample for a given emotion class.
    Uses emotion-specific amplitude ranges for each frequency band.
    Adds realistic noise to simulate inter-session variability.
    """
    profile = EMOTION_PROFILES[emotion]
    t = np.linspace(0, n_samples / SAMPLING_RATE, n_samples)
    signal = np.zeros(n_samples)

    for band, (amp_low, amp_high) in profile.items():
        freq_low, freq_high = BAND_FREQS[band]
        amplitude = np.random.uniform(amp_low, amp_high)
        frequency = np.random.uniform(freq_low, freq_high)
        phase = np.random.uniform(0, 2 * np.pi)
        signal += amplitude * np.sin(2 * np.pi * frequency * t + phase)

    # Realistic EEG noise (σ ≈ 0.5 μV)
    signal += np.random.normal(0, 0.5, n_samples)
    return signal


def build_dataset() -> tuple:
    """
    Generate the full training dataset.
    Returns X (feature matrix) and y (label array).
    """
    X, y = [], []
    print(f"\n{'='*55}")
    print(f"  EmoHarmony - Generating Training Data")
    print(f"{'='*55}")

    for emotion in EMOTIONS:
        print(f"  Generating {N_SAMPLES_PER_EMOTION:,} samples for [{emotion}]...", end=" ")
        count = 0
        for _ in range(N_SAMPLES_PER_EMOTION):
            # Generate raw EEG signal
            raw = generate_eeg_for_emotion(emotion)
            # Preprocess (filter + normalize) — same pipeline as in main.py
            preprocessed = preprocess_eeg(raw, fs=SAMPLING_RATE)
            # Extract 5 band power features
            band_powers = extract_band_powers(preprocessed, fs=SAMPLING_RATE)
            features = list(band_powers.values())  # [delta, theta, alpha, beta, gamma]
            X.append(features)
            y.append(emotion)
            count += 1
        print(f"✓ {count} samples done")

    X = np.array(X)
    y = np.array(y)
    print(f"\n  Total dataset: {X.shape[0]} samples × {X.shape[1]} features")
    print(f"  Features: delta, theta, alpha, beta, gamma band powers\n")
    return X, y


def train_and_save():
    """Main training pipeline: generate data → train → evaluate → save."""

    # 1. Build dataset
    X, y = build_dataset()

    # 2. Train/test split (80/20, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    os.makedirs(MODELS_DIR, exist_ok=True)

    # ── Train SVM ─────────────────────────────────────────────────────────
    print(f"{'='*55}")
    print("  Training SVM (RBF kernel) ...")
    print(f"{'='*55}")

    svm_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(
            kernel="rbf",
            C=10.0,
            gamma="scale",
            probability=True,   # needed for predict_proba
            class_weight="balanced",
            random_state=42,
        )),
    ])

    svm_pipeline.fit(X_train, y_train)
    svm_pred = svm_pipeline.predict(X_test)
    svm_acc = accuracy_score(y_test, svm_pred)

    print(f"\n  SVM Test Accuracy: {svm_acc*100:.2f}%")
    print("\n  Classification Report (SVM):")
    print(classification_report(y_test, svm_pred, target_names=EMOTIONS))

    # 5-fold cross-validation
    cv_scores = cross_val_score(svm_pipeline, X, y, cv=5)
    print(f"  5-Fold CV Accuracy: {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    svm_path = os.path.join(MODELS_DIR, "svm_model.pkl")
    joblib.dump(svm_pipeline, svm_path)
    print(f"\n  ✅ SVM saved → {svm_path}")

    # ── Train Random Forest ───────────────────────────────────────────────
    print(f"\n{'='*55}")
    print("  Training Random Forest (200 trees) ...")
    print(f"{'='*55}")

    rf_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("rf", RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    rf_pipeline.fit(X_train, y_train)
    rf_pred = rf_pipeline.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_pred)

    print(f"\n  Random Forest Test Accuracy: {rf_acc*100:.2f}%")
    print("\n  Classification Report (RF):")
    print(classification_report(y_test, rf_pred, target_names=EMOTIONS))

    rf_path = os.path.join(MODELS_DIR, "rf_model.pkl")
    joblib.dump(rf_pipeline, rf_path)
    print(f"\n  ✅ Random Forest saved → {rf_path}")

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print("  TRAINING COMPLETE")
    print(f"{'='*55}")
    print(f"  SVM Accuracy         : {svm_acc*100:.2f}%")
    print(f"  Random Forest Acc    : {rf_acc*100:.2f}%")
    print(f"  Models saved in      : {MODELS_DIR}/")
    print(f"\n  Now restart the ML service:")
    print(f"  uvicorn main:app --reload --port 8000\n")


if __name__ == "__main__":
    np.random.seed(42)  # reproducible training data
    train_and_save()
