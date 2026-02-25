"""
EmoHarmony - Model Training Script
===================================
Generates labeled synthetic EEG data based on published neuroscience
frequency profiles for 5 emotions, extracts real band power features
using the existing features.py pipeline, then trains and saves:
  - SVM (RBF kernel)         → models/svm_model.pkl
  - Random Forest            → models/rf_model.pkl
  - XGBoost                  → models/xgb_model.pkl
  - LightGBM                 → models/lgbm_model.pkl

Run once before starting the ML service:
    python train_model.py
"""

import os
import joblib
import numpy as np
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import classification_report, accuracy_score
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

from preprocessing import preprocess_eeg
from features import extract_features_from_multichannel

# ── Config ──────────────────────────────────────────────────────────────────
SAMPLING_RATE = 128.0
N_SAMPLES_PER_EMOTION = 3000   # 2000 → 3000: more data = better generalization
N_SIGNAL_SAMPLES = 1280
EMOTIONS = ["Happy", "Calm", "Stress", "Angry", "Sad"]
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Emotion-specific frequency amplitude profiles (μV)
# Sharpened to maximise inter-class separability for ML classifiers.
# Key discriminators:
#   Happy  : HIGH alpha (positive valence) + moderate beta
#   Calm   : VERY HIGH alpha + LOW beta/gamma (relaxation)
#   Stress : HIGH beta + MODERATE gamma + LOW alpha (cognitive load)
#   Angry  : HIGH delta (arousal spike) + HIGH gamma + LOW alpha (intense negative)
#   Sad    : HIGH delta + HIGH theta + VERY LOW beta/gamma (withdrawal)
EMOTION_PROFILES = {
    "Happy": {
        "delta": (0.5, 2.0),    # LOW delta
        "theta": (1.0, 3.0),
        "alpha": (8.0, 16.0),   # HIGH alpha — positive valence
        "beta":  (3.0, 7.0),    # moderate beta
        "gamma": (0.5, 2.0),
    },
    "Calm": {
        "delta": (0.5, 1.5),    # VERY LOW delta
        "theta": (2.0, 5.0),    # some theta (meditative)
        "alpha": (12.0, 22.0),  # VERY HIGH alpha — deep relaxation
        "beta":  (0.3, 2.0),    # VERY LOW beta
        "gamma": (0.2, 0.8),    # VERY LOW gamma
    },
    "Stress": {
        "delta": (1.0, 3.0),
        "theta": (1.5, 4.0),
        "alpha": (1.0, 3.5),    # LOW alpha — cognitive load
        "beta":  (7.0, 15.0),   # VERY HIGH beta — stress marker
        "gamma": (2.0, 5.0),    # MODERATE gamma
    },
    "Angry": {
        "delta": (4.0, 10.0),   # HIGH delta — physiological arousal spike
        "theta": (1.0, 3.0),
        "alpha": (0.5, 2.5),    # VERY LOW alpha — strong negative affect
        "beta":  (4.0, 9.0),    # moderate-high beta
        "gamma": (6.0, 14.0),   # VERY HIGH gamma — intense arousal (key differentiator)
    },
    "Sad": {
        "delta": (5.0, 12.0),   # HIGHEST delta — low consciousness / withdrawal
        "theta": (4.0, 9.0),    # HIGH theta — drowsiness
        "alpha": (1.0, 3.5),    # LOW alpha
        "beta":  (0.2, 1.5),    # VERY LOW beta — low energy
        "gamma": (0.1, 0.5),    # VERY LOW gamma — minimal arousal
    },
}

BAND_FREQS = {
    "delta": (1.0, 3.0),
    "theta": (5.0, 7.0),
    "alpha": (10.0, 12.0),
    "beta":  (18.0, 25.0),
    "gamma": (35.0, 42.0),
}

# Frontal Alpha Asymmetry per emotion (Davidson 1992, Allen 2004)
# Stronger contrast = sharper FAA feature separation
ASYMMETRY_PROFILES = {
    "Happy":  (0.6, 1.6),   # right >> left → strong positive FAA
    "Calm":   (0.7, 1.4),   # right > left → positive FAA
    "Stress": (1.5, 0.6),   # left >> right → strong negative FAA
    "Angry":  (1.8, 0.4),   # left >>> right → strongest negative FAA
    "Sad":    (1.4, 0.7),   # left > right → negative FAA
}


def generate_eeg_for_emotion(emotion: str, n_samples: int = N_SIGNAL_SAMPLES) -> np.ndarray:
    """
    Generate a 2-channel (left/right hemisphere) EEG signal for a given emotion.

    Uses 3-5 overlapping sinusoids per frequency band with randomised phases,
    amplitudes, and slight frequency jitter — matching the additive structure
    of real EEG much better than a single pure tone per band.
    Adds 1/f (pink) noise to approximate real EEG background noise.
    """
    profile = EMOTION_PROFILES[emotion]
    left_scale, right_scale = ASYMMETRY_PROFILES[emotion]
    t = np.linspace(0, n_samples / SAMPLING_RATE, n_samples)

    def make_channel(alpha_scale: float) -> np.ndarray:
        ch = np.zeros(n_samples)
        for band, (amp_low, amp_high) in profile.items():
            freq_low, freq_high = BAND_FREQS[band]
            n_components = np.random.randint(3, 6)   # 3-5 overlapping components
            for _ in range(n_components):
                amplitude = np.random.uniform(amp_low, amp_high) / n_components
                if band == "alpha":
                    amplitude *= alpha_scale
                frequency = np.random.uniform(freq_low, freq_high)
                phase = np.random.uniform(0, 2 * np.pi)
                ch += amplitude * np.sin(2 * np.pi * frequency * t + phase)
        # 1/f pink noise: realistic background EEG noise
        white = np.random.randn(n_samples)
        fft   = np.fft.rfft(white)
        freqs = np.fft.rfftfreq(n_samples, d=1.0 / SAMPLING_RATE)
        freqs[0] = 1.0              # avoid division by zero at DC
        pink_filter = 1.0 / np.sqrt(freqs)
        pink_noise  = np.fft.irfft(fft * pink_filter, n=n_samples)
        pink_noise  = pink_noise / (np.std(pink_noise) + 1e-10) * 0.3
        ch += pink_noise
        return ch

    left  = make_channel(left_scale)
    right = make_channel(right_scale)
    return np.column_stack([left, right])


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
            # Generate 2-channel (left/right) EEG with emotion-specific FAA profile
            raw = generate_eeg_for_emotion(emotion)   # shape: (samples, 2)
            # Preprocess each channel
            preprocessed = preprocess_eeg(raw, fs=SAMPLING_RATE)
            # Extract full 17-dim feature vector (includes FAA from 2 channels)
            fv = extract_features_from_multichannel(preprocessed, fs=SAMPLING_RATE)
            X.append(fv)
            y.append(emotion)
            count += 1
        print(f"✓ {count} samples done")

    X = np.array(X)
    y = np.array(y)
    print(f"\n  Total dataset: {X.shape[0]} samples × {X.shape[1]} features")
    print(f"  Features: 5 rel.band powers + 3 ratios + 3 Hjorth + 1 entropy + 2 stats + 2 spectral + 1 FAA\n")
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

    # ── Train SVM (2D GridSearch: C × gamma) ────────────────────────────────
    print(f"\n{'='*55}")
    print("  Training SVM (2D GridSearch: C × gamma) ...")
    print(f"{'='*55}")

    svm_param_grid = {
        "svm__C":     [1.0, 10.0, 100.0],
        "svm__gamma": ["scale", 0.01, 0.001],
    }
    svm_search = GridSearchCV(
        Pipeline([
            ("scaler", StandardScaler()),
            ("svm", SVC(
                kernel="rbf",
                probability=True,
                class_weight="balanced",
                random_state=42,
            )),
        ]),
        param_grid=svm_param_grid,
        cv=3,
        n_jobs=-1,
        scoring="accuracy",
        verbose=0,
    )
    svm_search.fit(X_train, y_train)
    svm_pipeline = svm_search.best_estimator_
    print(f"  Best SVM params: {svm_search.best_params_}  CV={svm_search.best_score_*100:.2f}%")

    svm_pred = svm_pipeline.predict(X_test)
    svm_acc = accuracy_score(y_test, svm_pred)
    # Cross-val score for ensemble weight computation
    svm_cv = cross_val_score(svm_pipeline, X, y, cv=5, scoring="accuracy", n_jobs=-1).mean()

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

    # ── Train XGBoost (GridSearch: n_estimators × learning_rate) ─────────────
    print(f"\n{'='*55}")
    print("  Training XGBoost (GridSearch) ...")
    print(f"{'='*55}")

    le = LabelEncoder()
    y_train_enc = le.fit_transform(y_train)
    y_test_enc  = le.transform(y_test)
    y_enc       = le.transform(y)

    # Shared scaler for XGB and LGBM
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)
    X_sc        = scaler.transform(X)

    xgb_param_grid = {
        "n_estimators":  [300, 500],
        "learning_rate": [0.05, 0.08],
    }
    xgb_base = XGBClassifier(
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.5,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )
    xgb_gs = GridSearchCV(
        xgb_base,
        param_grid=xgb_param_grid,
        cv=3,
        scoring="accuracy",
        n_jobs=-1,
        verbose=0,
    )
    xgb_gs.fit(X_train_sc, y_train_enc)
    xgb_model = xgb_gs.best_estimator_
    print(f"  Best XGBoost params: {xgb_gs.best_params_}  CV={xgb_gs.best_score_*100:.2f}%")

    xgb_pred_enc = xgb_model.predict(X_test_sc)
    xgb_pred = le.inverse_transform(xgb_pred_enc)
    xgb_acc  = accuracy_score(y_test, xgb_pred)
    xgb_cv   = cross_val_score(
        xgb_gs.best_estimator_, X_sc, y_enc, cv=5, scoring="accuracy", n_jobs=-1
    ).mean()

    print(f"\n  XGBoost Test Accuracy : {xgb_acc*100:.2f}%")
    print("\n  Classification Report (XGBoost):")
    print(classification_report(y_test, xgb_pred, target_names=EMOTIONS))

    xgb_bundle = {"model": xgb_model, "scaler": scaler, "le": le}
    xgb_path = os.path.join(MODELS_DIR, "xgb_model.pkl")
    joblib.dump(xgb_bundle, xgb_path)
    print(f"\n  ✅ XGBoost saved → {xgb_path}")

    # ── Train LightGBM (GridSearch: num_leaves × min_child_samples) ──────────
    print(f"\n{'='*55}")
    print("  Training LightGBM (GridSearch) ...")
    print(f"{'='*55}")

    lgbm_param_grid = {
        "num_leaves":       [31, 63, 127],
        "min_child_samples":[10, 20],
    }
    lgbm_base = LGBMClassifier(
        n_estimators=400,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    lgbm_gs = GridSearchCV(
        lgbm_base,
        param_grid=lgbm_param_grid,
        cv=3,
        scoring="accuracy",
        n_jobs=-1,
        verbose=0,
    )
    lgbm_gs.fit(X_train_sc, y_train, feature_name="auto")
    lgbm_model = lgbm_gs.best_estimator_
    print(f"  Best LightGBM params: {lgbm_gs.best_params_}  CV={lgbm_gs.best_score_*100:.2f}%")

    lgbm_pred = lgbm_model.predict(X_test_sc)
    lgbm_acc  = accuracy_score(y_test, lgbm_pred)
    lgbm_cv   = cross_val_score(
        lgbm_gs.best_estimator_, X_sc, y,
        cv=5, scoring="accuracy", n_jobs=-1
    ).mean()

    print(f"\n  LightGBM Test Accuracy: {lgbm_acc*100:.2f}%")
    print("\n  Classification Report (LightGBM):")
    print(classification_report(y_test, lgbm_pred, target_names=EMOTIONS))

    lgbm_bundle = {"model": lgbm_model, "scaler": scaler}
    lgbm_path = os.path.join(MODELS_DIR, "lgbm_model.pkl")
    joblib.dump(lgbm_bundle, lgbm_path)
    print(f"\n  ✅ LightGBM saved → {lgbm_path}")

    # ── Auto-compute optimal ensemble weights from cross-val accuracy ────────
    print(f"\n{'='*55}")
    print("  Computing optimal ensemble weights ...")
    print(f"{'='*55}")
    cv_scores = {"svm": svm_cv, "xgb": xgb_cv, "lgbm": lgbm_cv}
    total_cv = sum(cv_scores.values())
    weights = {k: round(v / total_cv, 4) for k, v in cv_scores.items()}
    print(f"  SVM  CV={svm_cv*100:.2f}%  weight={weights['svm']:.3f}")
    print(f"  XGB  CV={xgb_cv*100:.2f}%  weight={weights['xgb']:.3f}")
    print(f"  LGBM CV={lgbm_cv*100:.2f}%  weight={weights['lgbm']:.3f}")
    weights_path = os.path.join(MODELS_DIR, "ensemble_weights.pkl")
    joblib.dump(weights, weights_path)
    print(f"  ✅ Ensemble weights saved → {weights_path}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print("  TRAINING COMPLETE")
    print(f"{'='*55}")
    print(f"  SVM Accuracy         : {svm_acc*100:.2f}%  (CV={svm_cv*100:.2f}%)")
    print(f"  Random Forest Acc    : {rf_acc*100:.2f}%")
    print(f"  XGBoost Accuracy     : {xgb_acc*100:.2f}%  (CV={xgb_cv*100:.2f}%)")
    print(f"  LightGBM Accuracy    : {lgbm_acc*100:.2f}%  (CV={lgbm_cv*100:.2f}%)")
    print(f"  Ensemble Weights     : SVM={weights['svm']:.3f} XGB={weights['xgb']:.3f} LGBM={weights['lgbm']:.3f}")
    print(f"  Models saved in      : {MODELS_DIR}/")
    print(f"\n  Restart the ML service:")
    print(f"  uvicorn main:app --reload --port 8000\n")


if __name__ == "__main__":
    np.random.seed(42)  # reproducible training data
    train_and_save()
