"""
EmoHarmony ML Service - EEG Feature Extraction Module
Implements band power estimation using Welch's Power Spectral Density method.

EEG Frequency Bands:
    Delta (δ): 0.5 – 4  Hz  → deep sleep, unconscious processing
    Theta (θ): 4   – 8  Hz  → meditation, drowsiness, creativity
    Alpha (α): 8   – 13 Hz  → relaxed wakefulness, calm focus
    Beta  (β): 13  – 30 Hz  → active thinking, concentration, stress
    Gamma (γ): 30  – 50 Hz  → high-level cognition, perception
"""

import numpy as np
from scipy import signal as scipy_signal
from typing import Dict


# Frequency band definitions (Hz)
BANDS = {
    "delta": (0.5, 4.0),
    "theta": (4.0, 8.0),
    "alpha": (8.0, 13.0),
    "beta":  (13.0, 30.0),
    "gamma": (30.0, 50.0),
}


def compute_band_power(psd: np.ndarray, freqs: np.ndarray,
                       fmin: float, fmax: float) -> float:
    """
    Compute average power in a specific frequency band using trapezoidal integration.

    Args:
        psd: Power spectral density values
        freqs: Frequency array corresponding to psd
        fmin: Lower frequency bound
        fmax: Upper frequency bound

    Returns:
        Band power value (μV²/Hz)
    """
    idx = np.where((freqs >= fmin) & (freqs <= fmax))[0]
    if len(idx) == 0:
        return 0.0
    return float(np.trapz(psd[idx], freqs[idx]))


def extract_band_powers(eeg_signal: np.ndarray,
                        fs: float = 128.0) -> Dict[str, float]:
    """
    Extract per-band power from 1D EEG signal using Welch's method.

    Welch's method divides signal into overlapping segments, computes
    FFT for each segment, and averages the resulting spectra – providing
    a smoother and more reliable PSD estimate than simple FFT.

    Args:
        eeg_signal: 1D preprocessed EEG signal
        fs: Sampling frequency in Hz

    Returns:
        Dictionary with band names as keys and power values as values
    """
    n_samples = len(eeg_signal)
    # Window size: 2 seconds or signal length (whichever is smaller)
    nperseg = min(int(2 * fs), n_samples)
    nperseg = max(nperseg, 4)  # Ensure at least 4 samples

    freqs, psd = scipy_signal.welch(
        eeg_signal,
        fs=fs,
        window="hann",
        nperseg=nperseg,
        noverlap=nperseg // 2,
        scaling="density",
    )

    band_powers = {}
    for band_name, (fmin, fmax) in BANDS.items():
        power = compute_band_power(psd, freqs, fmin, fmax)
        band_powers[band_name] = round(power, 4)

    return band_powers


def extract_features_from_multichannel(eeg_data: np.ndarray,
                                       fs: float = 128.0) -> np.ndarray:
    """
    Extract feature vector from multi-channel EEG data.
    For each channel, extracts 5 band powers → total features = channels × 5.

    Args:
        eeg_data: 2D array (samples × channels)
        fs: Sampling frequency

    Returns:
        1D feature vector (channels × 5 band powers flattened)
    """
    if eeg_data.ndim == 1:
        powers = extract_band_powers(eeg_data, fs)
        return np.array(list(powers.values()))

    all_features = []
    for ch in range(eeg_data.shape[1]):
        powers = extract_band_powers(eeg_data[:, ch], fs)
        all_features.extend(powers.values())
    return np.array(all_features)


def compute_ratios(band_powers: Dict[str, float]) -> Dict[str, float]:
    """
    Compute neurological ratios that correlate with emotional states:
    - Alpha/Beta ratio → relaxation vs stress
    - Theta/Alpha ratio → mental effort
    - (Alpha + Theta) / Beta → fatigue index

    Args:
        band_powers: Dict of band name → power value

    Returns:
        Dict of ratio names → ratio values
    """
    alpha = band_powers.get("alpha", 1e-6)
    beta = band_powers.get("beta", 1e-6)
    theta = band_powers.get("theta", 1e-6)

    eps = 1e-9  # prevent division by zero
    return {
        "alpha_beta_ratio": round(alpha / (beta + eps), 4),
        "theta_alpha_ratio": round(theta / (alpha + eps), 4),
        "fatigue_index": round((alpha + theta) / (beta + eps), 4),
    }
