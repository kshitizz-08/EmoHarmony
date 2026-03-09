"""
EmoHarmony - Real LSTM Training Script
=======================================
Trains a Bidirectional LSTM on raw EEG windows generated with the same
emotion-specific profiles used by train_model.py.

Key differences from train_model.py:
  - Input is RAW EEG time-series windows, NOT extracted feature vectors
  - PyTorch LSTM instead of sklearn classifiers
  - Data augmentation: amplitude jitter + additive Gaussian noise

Run (one-time, ~2-4 min on CPU):
    python train_lstm.py

Saves:
    models/lstm_model.pt   — trained model weights
    models/lstm_meta.pkl   — LabelEncoder + normalisation stats
"""

import os
import sys
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

# ── Resolve correct working directory ────────────────────────────────────────
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, THIS_DIR)
os.chdir(THIS_DIR)

from lstm_model import _build_model, MODELS_DIR, LSTM_PT, LSTM_META, WINDOW_SAMPLES

# ── Re-use emotion profiles from train_model.py ───────────────────────────────
SAMPLING_RATE = 128.0
N_SAMPLES_PER_EMOTION = 1000    # per emotion; 5k total (faster)
EMOTIONS = ["Happy", "Calm", "Stress", "Angry", "Sad"]
N_CHANNELS = 2   # left + right hemisphere

EMOTION_PROFILES = {
    "Happy":  {"delta": (0.5, 2.0), "theta": (1.0, 3.0), "alpha": (8.0, 16.0), "beta": (3.0, 7.0),  "gamma": (0.5, 2.0)},
    "Calm":   {"delta": (0.5, 1.5), "theta": (2.0, 5.0), "alpha": (12.0, 22.0),"beta": (0.3, 2.0),  "gamma": (0.2, 0.8)},
    "Stress": {"delta": (1.0, 3.0), "theta": (1.5, 4.0), "alpha": (1.0, 3.5),  "beta": (7.0, 15.0), "gamma": (2.0, 5.0)},
    "Angry":  {"delta": (4.0, 10.0),"theta": (1.0, 3.0), "alpha": (0.5, 2.5),  "beta": (4.0, 9.0),  "gamma": (6.0, 14.0)},
    "Sad":    {"delta": (5.0, 12.0),"theta": (4.0, 9.0), "alpha": (1.0, 3.5),  "beta": (0.2, 1.5),  "gamma": (0.1, 0.5)},
}
BAND_FREQS = {
    "delta": (1.0, 3.0), "theta": (5.0, 7.0), "alpha": (10.0, 12.0),
    "beta": (18.0, 25.0), "gamma": (35.0, 42.0),
}
ASYMMETRY_PROFILES = {
    "Happy": (0.6, 1.6), "Calm": (0.7, 1.4),
    "Stress": (1.5, 0.6), "Angry": (1.8, 0.4), "Sad": (1.4, 0.7),
}


# ── Signal Generation ─────────────────────────────────────────────────────────

def _make_channel(profile: dict, alpha_scale: float, t: np.ndarray, n_samples: int) -> np.ndarray:
    ch = np.zeros(n_samples)
    for band, (amp_low, amp_high) in profile.items():
        freq_low, freq_high = BAND_FREQS[band]
        n_comp = np.random.randint(3, 6)
        for _ in range(n_comp):
            amp   = np.random.uniform(amp_low, amp_high) / n_comp
            if band == "alpha":
                amp *= alpha_scale
            freq  = np.random.uniform(freq_low, freq_high)
            phase = np.random.uniform(0, 2 * np.pi)
            ch   += amp * np.sin(2 * np.pi * freq * t + phase)
    # 1/f pink noise
    white = np.random.randn(n_samples)
    fft   = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n_samples, d=1.0 / SAMPLING_RATE)
    freqs[0] = 1.0
    pink = np.fft.irfft(fft / np.sqrt(freqs), n=n_samples)
    ch  += pink / (np.std(pink) + 1e-10) * 0.3
    return ch


def generate_window(emotion: str) -> np.ndarray:
    """Generate one raw 2-channel EEG window of WINDOW_SAMPLES length."""
    n = WINDOW_SAMPLES
    t = np.linspace(0, n / SAMPLING_RATE, n)
    profile = EMOTION_PROFILES[emotion]
    left_s, right_s = ASYMMETRY_PROFILES[emotion]
    left  = _make_channel(profile, left_s,  t, n)
    right = _make_channel(profile, right_s, t, n)
    return np.column_stack([left, right])   # (WINDOW_SAMPLES, 2)


# ── Data Augmentation ─────────────────────────────────────────────────────────

def augment(window: np.ndarray) -> np.ndarray:
    """
    Two simple augmentations that preserve emotional band content:
      1. Amplitude scaling: multiply by U(0.80, 1.20)
      2. Additive Gaussian noise: σ = 5% of signal std
    """
    scale  = np.random.uniform(0.80, 1.20)
    window = window * scale
    noise  = np.random.randn(*window.shape) * (np.std(window) * 0.05)
    return window + noise


# ── Build Dataset ─────────────────────────────────────────────────────────────

def build_raw_dataset():
    """
    Generate N_SAMPLES_PER_EMOTION raw EEG windows per emotion.
    Returns:
        X : (N_total, WINDOW_SAMPLES, N_CHANNELS)  float32
        y : (N_total,)   string labels
    """
    X_list, y_list = [], []
    print(f"\n{'='*55}")
    print("  EmoHarmony LSTM — Generating Raw EEG Windows")
    print(f"{'='*55}")

    for emotion in EMOTIONS:
        print(f"  Generating {N_SAMPLES_PER_EMOTION:,} windows for [{emotion}]...", end=" ", flush=True)
        for _ in range(N_SAMPLES_PER_EMOTION):
            w = generate_window(emotion)
            # 50% chance of augmentation on training data
            if np.random.rand() < 0.5:
                w = augment(w)
            X_list.append(w.astype(np.float32))
            y_list.append(emotion)
        print(f"✓")

    X = np.array(X_list)   # (N, T, C)
    y = np.array(y_list)
    print(f"\n  Dataset shape: {X.shape}   Labels: {np.unique(y)}\n")
    return X, y


# ── Training Loop ─────────────────────────────────────────────────────────────

def train_lstm():
    try:
        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader, TensorDataset
    except ImportError:
        print("\n❌ PyTorch not found. Install with:")
        print("   pip install torch --index-url https://download.pytorch.org/whl/cpu\n")
        sys.exit(1)

    # 1. Build dataset ────────────────────────────────────────────────────────
    X, y = build_raw_dataset()

    le = LabelEncoder()
    y_enc = le.fit_transform(y)          # strings → 0..4

    # 2. Normalise per channel (statistics from full dataset) ─────────────────
    mean = X.mean(axis=(0, 1), keepdims=True).squeeze(0)  # (T,C) → (C,)  after squeeze
    # Correct: mean over (samples, timesteps) for each channel
    mean = X.reshape(-1, N_CHANNELS).mean(axis=0)         # (C,)
    std  = X.reshape(-1, N_CHANNELS).std(axis=0)          # (C,)
    X    = (X - mean) / (std + 1e-8)

    # 3. Train / val split ────────────────────────────────────────────────────
    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y_enc, test_size=0.15, random_state=42, stratify=y_enc
    )

    device = torch.device("cpu")

    X_tr_t  = torch.tensor(X_tr,  dtype=torch.float32)
    y_tr_t  = torch.tensor(y_tr,  dtype=torch.long)
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.long)

    train_loader = DataLoader(TensorDataset(X_tr_t, y_tr_t), batch_size=64, shuffle=True)
    val_loader   = DataLoader(TensorDataset(X_val_t, y_val_t), batch_size=128, shuffle=False)

    # 4. Model, optimizer, scheduler ──────────────────────────────────────────
    model     = _build_model(n_channels=N_CHANNELS, n_classes=len(le.classes_)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=30, eta_min=1e-5)

    EPOCHS = 20
    print(f"{'='*55}")
    print(f"  Training Bi-LSTM  ({EPOCHS} epochs, batch=64, Adam)")
    print(f"{'='*55}")

    best_val_acc = 0.0
    best_state   = None

    for epoch in range(1, EPOCHS + 1):
        # ── Train ──────────────────────────────────────────────────────────
        model.train()
        total_loss, correct, total = 0.0, 0, 0
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            logits = model(xb)
            loss   = criterion(logits, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            total_loss += loss.item() * len(yb)
            preds       = logits.argmax(dim=1)
            correct    += (preds == yb).sum().item()
            total      += len(yb)

        train_acc = correct / total * 100
        avg_loss  = total_loss / total

        # ── Validate ───────────────────────────────────────────────────────
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(device), yb.to(device)
                preds   = model(xb).argmax(dim=1)
                val_correct += (preds == yb).sum().item()
                val_total   += len(yb)

        val_acc = val_correct / val_total * 100
        scheduler.step()

        # Track best checkpoint
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state   = {k: v.clone() for k, v in model.state_dict().items()}

        if epoch % 5 == 0 or epoch == 1:
            lr = optimizer.param_groups[0]["lr"]
            print(f"  Epoch {epoch:3d}/{EPOCHS}  loss={avg_loss:.4f}  "
                  f"train={train_acc:.1f}%  val={val_acc:.1f}%  lr={lr:.2e}")

    # 5. Save best checkpoint + meta ──────────────────────────────────────────
    os.makedirs(MODELS_DIR, exist_ok=True)
    model.load_state_dict(best_state)
    torch.save(model.state_dict(), LSTM_PT)

    meta = {
        "le":         le,
        "mean":       mean,
        "std":        std,
        "n_channels": N_CHANNELS,
        "emotions":   list(le.classes_),
        "best_val_acc": round(best_val_acc, 2),
    }
    joblib.dump(meta, LSTM_META)

    print(f"\n{'='*55}")
    print(f"  LSTM TRAINING COMPLETE")
    print(f"{'='*55}")
    print(f"  Best validation accuracy : {best_val_acc:.2f}%")
    print(f"  Model saved  → {LSTM_PT}")
    print(f"  Meta saved   → {LSTM_META}")
    print(f"\n  Restart the ML service to enable the real LSTM:")
    print(f"  uvicorn main:app --reload --port 8000\n")


if __name__ == "__main__":
    np.random.seed(42)
    train_lstm()
