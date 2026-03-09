"""
EmoHarmony ML Service - Real Bidirectional LSTM for EEG Emotion Recognition
=============================================================================
Architecture: 2-layer Bidirectional LSTM on raw EEG time-series windows.

Input  : (batch, timesteps, n_channels)  e.g. (32, 256, 2)
Output : (batch, 5)  — softmax probabilities for 5 emotions

Training data  : synthetic EEG windows generated with emotion-specific profiles
Model saved at : models/lstm_model.pt
Meta saved at  : models/lstm_meta.pkl  (label encoder + normalization stats)

Usage:
    predictor = LSTMPredictor()
    emotion, confidence, scores = predictor.predict(raw_eeg_array)
"""

import os
import numpy as np
from typing import Tuple, Dict

# ─── Constants ────────────────────────────────────────────────────────────────

MODELS_DIR  = os.path.join(os.path.dirname(__file__), "models")
LSTM_PT     = os.path.join(MODELS_DIR, "lstm_model.pt")
LSTM_META   = os.path.join(MODELS_DIR, "lstm_meta.pkl")
EMOTIONS    = ["Angry", "Calm", "Happy", "Sad", "Stress"]   # alphabetical (label encoder order)
N_CHANNELS  = 2    # left + right hemisphere (or first 2 channels of real EEG)
WINDOW_SAMPLES = 256  # 2 seconds @ 128 Hz

# ─── Model Architecture ───────────────────────────────────────────────────────

def _build_model(n_channels: int = N_CHANNELS, n_classes: int = 5):
    """
    Build the Bi-LSTM model. Imported lazily so PyTorch is optional —
    the rest of the service works without it.
    """
    import torch
    import torch.nn as nn

    class EEGBiLSTM(nn.Module):
        """
        Bidirectional LSTM classifier for raw EEG time-series.

        Layer structure:
          Input (batch, T, C)
          → Bi-LSTM(64)     → captures forward + backward temporal patterns
          → Dropout(0.35)
          → Bi-LSTM(32)     → deeper abstraction
          → Last hidden state (both directions concatenated)
          → LayerNorm
          → Linear(128 → 64) + ReLU
          → Dropout(0.3)
          → Linear(64 → n_classes)
        """
        def __init__(self):
            super().__init__()
            self.lstm1 = nn.LSTM(
                input_size=n_channels, hidden_size=64,
                num_layers=1, batch_first=True,
                bidirectional=True, dropout=0.0,
            )
            self.drop1 = nn.Dropout(0.35)
            self.lstm2 = nn.LSTM(
                input_size=128, hidden_size=32,
                num_layers=1, batch_first=True,
                bidirectional=True, dropout=0.0,
            )
            self.norm  = nn.LayerNorm(64)
            self.head  = nn.Sequential(
                nn.Linear(64, 64),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(64, n_classes),
            )

        def forward(self, x):
            # x: (batch, T, C)
            out1, _ = self.lstm1(x)          # (batch, T, 128)
            out1    = self.drop1(out1)
            out2, (h, _) = self.lstm2(out1)  # h: (2, batch, 32)
            # Concatenate last hidden from both directions
            last = torch.cat([h[0], h[1]], dim=1)  # (batch, 64)
            last = self.norm(last)
            return self.head(last)           # (batch, n_classes)

    return EEGBiLSTM()


# ─── LSTMPredictor — high-level inference wrapper ────────────────────────────

class LSTMPredictor:
    """
    Load the trained LSTM from disk and run inference on raw EEG arrays.

    Usage:
        predictor = LSTMPredictor()
        if predictor.available:
            emotion, conf, scores = predictor.predict(eeg_array)
    """

    def __init__(self):
        self.model    = None
        self.meta     = None
        self.device   = None
        self.available = False
        self._load()

    def _load(self):
        """Load model and metadata from disk. Silently skips if files missing."""
        if not (os.path.exists(LSTM_PT) and os.path.exists(LSTM_META)):
            print(f"  ⚠️  LSTM model not found. Run: python train_lstm.py")
            return
        try:
            import torch
            import joblib

            self.device = torch.device("cpu")
            self.meta   = joblib.load(LSTM_META)   # {le, mean, std, n_channels}
            n_ch        = self.meta.get("n_channels", N_CHANNELS)

            self.model  = _build_model(n_channels=n_ch)
            self.model.load_state_dict(
                torch.load(LSTM_PT, map_location=self.device, weights_only=True)
            )
            self.model.eval()
            self.available = True
            print(f"  ✅ Real LSTM loaded from {LSTM_PT}")
        except Exception as e:
            print(f"  ⚠️  LSTM load failed: {e}")

    def _prepare_window(self, eeg_data: np.ndarray) -> "torch.Tensor":
        """
        Convert raw EEG array → normalised (1, T, C) tensor ready for the model.

        Handles:
          - 1D signal          → reshape to (T, 1) → tile to (T, n_channels)
          - Multi-channel      → take first n_channels or mean-pool to n_channels
          - Variable length    → crop / pad to WINDOW_SAMPLES
        """
        import torch

        n_ch_target = self.meta.get("n_channels", N_CHANNELS)
        mean        = self.meta["mean"]   # shape (n_ch_target,)
        std         = self.meta["std"]    # shape (n_ch_target,)

        # ── Reshape to (T, C) ───────────────────────────────────────────────
        if eeg_data.ndim == 1:
            eeg_data = eeg_data.reshape(-1, 1)
        T, C = eeg_data.shape

        # ── Select / reduce channels ─────────────────────────────────────────
        if C >= n_ch_target:
            seg = eeg_data[:, :n_ch_target]
        else:
            # Tile existing channels to match target count
            repeats = (n_ch_target // C) + 1
            seg = np.tile(eeg_data, (1, repeats))[:, :n_ch_target]

        # ── Crop center window or pad ────────────────────────────────────────
        W = WINDOW_SAMPLES
        if T >= W:
            start = (T - W) // 2
            seg   = seg[start:start + W]
        else:
            pad   = np.zeros((W - T, n_ch_target))
            seg   = np.vstack([seg, pad])

        # ── Normalise with training stats ────────────────────────────────────
        seg = (seg - mean) / (std + 1e-8)
        seg = seg.astype(np.float32)

        # ── Add batch dim: (1, W, C) ─────────────────────────────────────────
        return torch.tensor(seg).unsqueeze(0)

    def predict(
        self, eeg_data: np.ndarray
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Run LSTM inference on a raw EEG array.

        Args:
            eeg_data: numpy array, shape (samples,) or (samples, channels)

        Returns:
            (emotion_str, confidence_float, {emotion: probability})
        """
        import torch
        import torch.nn.functional as F

        le    = self.meta["le"]       # LabelEncoder
        x     = self._prepare_window(eeg_data)

        with torch.no_grad():
            logits = self.model(x)                  # (1, 5)
            proba  = F.softmax(logits, dim=1)[0]    # (5,)

        classes = list(le.classes_)
        scores  = {cls: round(float(proba[i]), 4) for i, cls in enumerate(classes)}
        best    = max(scores, key=scores.get)
        conf    = round(min(float(scores[best]) * 0.92 + 0.05, 0.98), 3)
        return best, conf, scores


# ─── Module-level singleton (loaded once at import) ───────────────────────────

_LSTM_PREDICTOR: LSTMPredictor = None   # lazily initialised

def get_lstm_predictor() -> LSTMPredictor:
    """Return (and lazily create) the module-level LSTM predictor singleton."""
    global _LSTM_PREDICTOR
    if _LSTM_PREDICTOR is None:
        _LSTM_PREDICTOR = LSTMPredictor()
    return _LSTM_PREDICTOR
