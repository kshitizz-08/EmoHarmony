"""
EmoHarmony ML Service - Enhanced EEG Feature Extraction Module
==============================================================
Extracts a rich 16-dimensional feature vector from preprocessed EEG signals.

Feature groups:
  1. Relative Band Powers  (5)  — delta%, theta%, alpha%, beta%, gamma%
  2. Band Power Ratios     (3)  — alpha/beta, theta/alpha, (alpha+theta)/beta
  3. Hjorth Parameters     (3)  — activity, mobility, complexity
  4. Spectral Entropy      (1)  — disorder in power spectrum
  5. Statistical Features  (2)  — skewness, excess kurtosis
  6. Spectral Edge + Peak  (2)  — 95% power edge frequency, dominant frequency

Total: 16 features per channel (mean across channels for multi-channel EEG)

EEG Frequency Bands:
    Delta (δ): 0.5 – 4  Hz  → deep sleep, unconscious processing
    Theta (θ): 4   – 8  Hz  → meditation, drowsiness, creativity
    Alpha (α): 8   – 13 Hz  → relaxed wakefulness, calm focus
    Beta  (β): 13  – 30 Hz  → active thinking, concentration, stress
    Gamma (γ): 30  – 50 Hz  → high-level cognition, perception
"""

import numpy as np
from scipy import signal as scipy_signal
from scipy.stats import skew, kurtosis
from typing import Dict, Tuple

# Frequency band definitions (Hz)
BANDS = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta":  (13.0, 30.0),
    "gamma": (30.0, 50.0),
}


# ── Band Power Functions ──────────────────────────────────────────────────────

def compute_band_power(psd: np.ndarray, freqs: np.ndarray,
                       fmin: float, fmax: float) -> float:
    """Compute average power in a frequency band via trapezoidal integration."""
    idx = np.where((freqs >= fmin) & (freqs <= fmax))[0]
    if len(idx) == 0:
        return 0.0
    return float(np.trapz(psd[idx], freqs[idx]))


def extract_band_powers(eeg_signal: np.ndarray,
                        fs: float = 128.0) -> Dict[str, float]:
    """
    Extract absolute per-band power from 1D EEG signal using Welch's method.
    Returns dict of band → power (μV²/Hz).
    """
    n_samples = len(eeg_signal)
    nperseg = min(int(2 * fs), n_samples)
    nperseg = max(nperseg, 4)

    freqs, psd = scipy_signal.welch(
        eeg_signal, fs=fs, window="hann",
        nperseg=nperseg, noverlap=nperseg // 2, scaling="density",
    )

    return {
        band: round(compute_band_power(psd, freqs, fmin, fmax), 6)
        for band, (fmin, fmax) in BANDS.items()
    }


def compute_relative_band_powers(band_powers: Dict[str, float]) -> Dict[str, float]:
    """
    Convert absolute band powers to relative (scale-invariant) fractions.
    Each value = band_power / total_power, so all values sum to ~1.0.

    This is critical for real EEG data: different devices/gain settings
    produce wildly different absolute amplitudes, but the *distribution*
    of power across bands is what actually encodes emotional state.
    """
    total = sum(band_powers.values())
    if total < 1e-10:
        n = len(band_powers)
        return {k: round(1.0 / n, 6) for k in band_powers}
    return {k: round(v / total, 6) for k, v in band_powers.items()}


# ── Band Power Ratios ─────────────────────────────────────────────────────────

def compute_ratios(band_powers: Dict[str, float]) -> Dict[str, float]:
    """
    Compute neurologically meaningful frequency ratios.
    These are returned to the frontend for display (not used in model input).
    """
    alpha = band_powers.get("alpha", 1e-6)
    beta  = band_powers.get("beta",  1e-6)
    theta = band_powers.get("theta", 1e-6)
    eps   = 1e-9
    return {
        "alpha_beta_ratio":  round(alpha / (beta  + eps), 4),
        "theta_alpha_ratio": round(theta / (alpha + eps), 4),
        "fatigue_index":     round((alpha + theta) / (beta + eps), 4),
    }


def _ratio_features(rel_band_powers: Dict[str, float]) -> Tuple[float, float, float]:
    """
    Compute 3 band-ratio features from *relative* band powers.
    Used as part of the model feature vector.
    """
    alpha = rel_band_powers.get("alpha", 1e-6)
    beta  = rel_band_powers.get("beta",  1e-6)
    theta = rel_band_powers.get("theta", 1e-6)
    eps   = 1e-9
    return (
        alpha / (beta  + eps),           # relaxation index
        theta / (alpha + eps),           # mental load index
        (alpha + theta) / (beta + eps),  # fatigue index
    )


# ── Hjorth Parameters ─────────────────────────────────────────────────────────

def compute_hjorth_parameters(signal: np.ndarray) -> Tuple[float, float, float]:
    """
    Compute Hjorth parameters — classic time-domain EEG descriptors.

    Activity   = variance of the signal (signal power)
    Mobility   = std(dx/dt) / std(x)    → ratio of dominant frequencies
    Complexity = mobility(dx/dt) / mobility(x) → signal shape complexity

    Reference: Hjorth (1970), "EEG analysis based on time domain properties"

    Returns:
        (activity, mobility, complexity) — all normalized to [0, 1] range
    """
    eps = 1e-10
    signal = np.asarray(signal, dtype=float)

    # Activity
    activity = float(np.var(signal))

    # First derivative
    dx = np.diff(signal)
    mobility = float(np.std(dx) / (np.std(signal) + eps))

    # Second derivative
    ddx = np.diff(dx)
    mobility_dx = float(np.std(ddx) / (np.std(dx) + eps))
    complexity = float(mobility_dx / (mobility + eps))

    # Soft-clip to reasonable range to avoid extreme outliers
    activity   = float(np.log1p(activity))      # log-scale for variance
    mobility   = float(np.clip(mobility,   0.0, 10.0))
    complexity = float(np.clip(complexity, 0.0, 10.0))

    return activity, mobility, complexity


# ── Spectral Entropy ──────────────────────────────────────────────────────────

def compute_spectral_entropy(psd: np.ndarray, freqs: np.ndarray,
                             fmin: float = 0.5, fmax: float = 50.0) -> float:
    """
    Compute spectral entropy of the EEG power spectrum in [fmin, fmax].

    Spectral entropy = Shannon entropy of the normalised PSD.
    Low entropy  → power concentrated in few bands (e.g. strong alpha in Calm)
    High entropy → power spread across many frequencies (e.g. Stress/Angry)

    Reference: Inouye et al. (1991), "Quantification of EEG irregularity"
    """
    idx = np.where((freqs >= fmin) & (freqs <= fmax))[0]
    if len(idx) < 2:
        return 0.0
    psd_band = psd[idx]
    total = psd_band.sum()
    if total < 1e-10:
        return 0.0
    p = psd_band / total                   # normalise to probability dist
    p = p[p > 1e-12]                       # avoid log(0)
    entropy = float(-np.sum(p * np.log2(p)))
    # Normalise by max possible entropy (uniform dist over N bins)
    max_entropy = np.log2(len(idx))
    return round(entropy / max_entropy if max_entropy > 0 else 0.0, 6)


# ── Statistical Features ──────────────────────────────────────────────────────

def compute_statistical_features(signal: np.ndarray) -> Tuple[float, float]:
    """
    Compute skewness and excess kurtosis of the EEG signal amplitude.

    Skewness  → asymmetry of amplitude distribution
    Kurtosis  → peakedness / heavy tails (epileptic spikes score high)

    These capture signal morphology differences between emotional states
    that pure frequency-domain methods miss.
    """
    sk  = float(np.clip(skew(signal),              -5.0, 5.0))
    kur = float(np.clip(kurtosis(signal, fisher=True), -5.0, 10.0))
    return sk, kur


# ── Spectral Edge & Peak Frequency ────────────────────────────────────────────

def compute_spectral_edge_and_peak(psd: np.ndarray, freqs: np.ndarray,
                                   fmin: float = 0.5, fmax: float = 50.0,
                                   edge_pct: float = 0.95) -> Tuple[float, float]:
    """
    Compute spectral edge frequency (SEF95) and dominant (peak) frequency.

    SEF95       → frequency below which 95% of total power is contained.
                  Low SEF95 → delta/theta dominant (Sad/drowsy)
                  High SEF95 → beta/gamma dominant (Stress/Angry)
    Peak freq   → frequency with maximum power density.

    Returns both normalised to [0, 1] using the analysis bandwidth.
    """
    idx = np.where((freqs >= fmin) & (freqs <= fmax))[0]
    if len(idx) < 2:
        return 0.5, 0.5

    psd_band  = psd[idx]
    freq_band = freqs[idx]
    total     = psd_band.sum()

    # SEF95
    if total < 1e-10:
        sef = freq_band[len(freq_band) // 2]
    else:
        cumsum = np.cumsum(psd_band) / total
        sef_idx = np.searchsorted(cumsum, edge_pct)
        sef_idx = min(sef_idx, len(freq_band) - 1)
        sef = float(freq_band[sef_idx])

    # Peak frequency
    peak = float(freq_band[np.argmax(psd_band)])

    bw = fmax - fmin
    return round((sef - fmin)  / bw, 6), round((peak - fmin) / bw, 6)


# ── Frontal Alpha Asymmetry ──────────────────────────────────────────────────

def compute_alpha_asymmetry(eeg_data: np.ndarray, fs: float = 128.0) -> float:
    """
    Compute Frontal Alpha Asymmetry (FAA) index.

    FAA = ln(alpha_power_right) - ln(alpha_power_left)

    Neuroscience basis (Davidson, 1992; Allen et al., 2004):
    - Left frontal cortex activation (low left alpha) → approach motivation
      → associated with Happy, Calm (positive affect)
    - Right frontal cortex activation (low right alpha) → withdrawal motivation
      → associated with Sad, Stress, Angry (negative affect)

    Convention used here:
      FAA < 0 : left alpha dominates → more right-brain active → negative affect
      FAA > 0 : right alpha dominates → more left-brain active → positive affect
      FAA ≈ 0 : symmetric / insufficient channel information

    For generic multi-channel EEG CSV:
      - First half of channels treated as "left hemisphere"
      - Second half of channels treated as "right hemisphere"
    For single-channel EEG:
      - Returns 0.0 (cannot compute asymmetry)

    Args:
        eeg_data: Preprocessed EEG, shape (samples,) or (samples × channels)
        fs: Sampling frequency in Hz

    Returns:
        FAA index as a float, clipped to [-3.0, 3.0]
    """
    if eeg_data.ndim == 1 or eeg_data.shape[1] < 2:
        return 0.0  # Cannot compute with one channel

    n_channels = eeg_data.shape[1]
    mid = n_channels // 2
    left_channels  = range(0,   mid)          # first half = left hemisphere
    right_channels = range(mid, n_channels)   # second half = right hemisphere

    eps = 1e-10

    def mean_alpha(ch_indices):
        powers = []
        for ch in ch_indices:
            bp = extract_band_powers(eeg_data[:, ch], fs)
            powers.append(max(bp.get("alpha", eps), eps))
        return float(np.mean(powers))

    alpha_left  = mean_alpha(left_channels)
    alpha_right = mean_alpha(right_channels)

    faa = np.log(alpha_right) - np.log(alpha_left)
    return float(np.clip(faa, -3.0, 3.0))



def extract_enhanced_feature_vector(signal_1d: np.ndarray,
                                    fs: float = 128.0) -> np.ndarray:
    """
    Extract a 16-dimensional feature vector from a 1D EEG signal.

    Features (in order):
      [0-4]   Relative band powers:  delta%, theta%, alpha%, beta%, gamma%
      [5-7]   Band power ratios:     alpha/beta, theta/alpha, (α+θ)/β
      [8-10]  Hjorth parameters:     activity, mobility, complexity
      [11]    Spectral entropy:      normalised Shannon entropy of PSD
      [12-13] Statistical:           skewness, excess kurtosis
      [14-15] Spectral edge/peak:    SEF95 (norm), peak freq (norm)

    All features are scale-invariant or log/clip normalised so that the
    vector is comparable across different EEG devices and amplitude ranges.

    Args:
        signal_1d: Preprocessed 1D EEG signal (single channel or channel mean)
        fs: Sampling frequency in Hz

    Returns:
        numpy array of shape (16,)
    """
    n_samples = len(signal_1d)
    nperseg = max(min(int(2 * fs), n_samples), 4)

    freqs, psd = scipy_signal.welch(
        signal_1d, fs=fs, window="hann",
        nperseg=nperseg, noverlap=nperseg // 2, scaling="density",
    )

    # 1. Relative band powers (5)
    abs_bp  = {b: compute_band_power(psd, freqs, fmin, fmax)
               for b, (fmin, fmax) in BANDS.items()}
    rel_bp  = compute_relative_band_powers(abs_bp)
    f1 = list(rel_bp.values())                     # [delta%, theta%, alpha%, beta%, gamma%]

    # 2. Band-power ratios (3)
    f2 = list(_ratio_features(rel_bp))             # [α/β, θ/α, (α+θ)/β]

    # 3. Hjorth parameters (3)
    f3 = list(compute_hjorth_parameters(signal_1d))  # [activity, mobility, complexity]

    # 4. Spectral entropy (1)
    f4 = [compute_spectral_entropy(psd, freqs)]

    # 5. Statistical (2)
    f5 = list(compute_statistical_features(signal_1d))

    # 6. Spectral edge + peak (2)
    f6 = list(compute_spectral_edge_and_peak(psd, freqs))

    feature_vec = np.array(f1 + f2 + f3 + f4 + f5 + f6, dtype=float)

    # Safety: replace any NaN/Inf with 0
    feature_vec = np.nan_to_num(feature_vec, nan=0.0, posinf=0.0, neginf=0.0)

    return feature_vec


def extract_features_from_multichannel(eeg_data: np.ndarray,
                                       fs: float = 128.0) -> np.ndarray:
    """
    Extract enhanced 17-dim feature vector from multi-channel EEG.

    For single-channel: 16 base features + FAA=0.0 → shape (17,)
    For multi-channel:  mean of 16-dim vectors across channels + FAA → shape (17,)

    Feature layout:
      [0-4]   Relative band powers (delta%, theta%, alpha%, beta%, gamma%)
      [5-7]   Band power ratios (alpha/beta, theta/alpha, fatigue)
      [8-10]  Hjorth parameters (activity, mobility, complexity)
      [11]    Spectral entropy
      [12-13] Statistical features (skewness, kurtosis)
      [14-15] Spectral edge + peak frequency
      [16]    Frontal Alpha Asymmetry (FAA) index  ← NEW

    Args:
        eeg_data: 2D (samples × channels) or 1D EEG signal
        fs: Sampling frequency

    Returns:
        Feature vector of shape (17,)
    """
    # Compute FAA from raw multi-channel data (before averaging)
    faa = compute_alpha_asymmetry(eeg_data, fs)

    if eeg_data.ndim == 1:
        base = extract_enhanced_feature_vector(eeg_data, fs)
    else:
        channel_features = [
            extract_enhanced_feature_vector(eeg_data[:, ch], fs)
            for ch in range(eeg_data.shape[1])
        ]
        base = np.mean(channel_features, axis=0)  # shape: (16,)

    feature_vec = np.append(base, faa)             # shape: (17,)
    return np.nan_to_num(feature_vec, nan=0.0, posinf=0.0, neginf=0.0)
