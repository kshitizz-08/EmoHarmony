"""
EmoHarmony ML Service - EEG Preprocessing Module
Implements signal processing for EEG brainwave data.

Techniques:
- Bandpass filtering (Butterworth filter via SciPy)
- Artifact removal (amplitude thresholding)
- Z-score normalization
"""

import numpy as np
from scipy import signal


def bandpass_filter(data: np.ndarray, lowcut: float, highcut: float,
                    fs: float = 128.0, order: int = 4) -> np.ndarray:
    """
    Apply Butterworth bandpass filter to EEG signal.

    Args:
        data: Raw EEG signal array (samples x channels) or 1D
        lowcut: Lower frequency boundary (Hz)
        highcut: Upper frequency boundary (Hz)
        fs: Sampling frequency (default 128 Hz)
        order: Filter order (default 4 for good roll-off)

    Returns:
        Filtered signal, same shape as input
    """
    nyquist = fs / 2.0
    low = lowcut / nyquist
    high = highcut / nyquist
    # Clamp to valid range (0, 1)
    low = max(0.001, min(low, 0.999))
    high = max(0.001, min(high, 0.999))
    if low >= high:
        return data
    b, a = signal.butter(order, [low, high], btype="band")
    if data.ndim == 1:
        return signal.filtfilt(b, a, data)
    # Apply along time axis (axis=0)
    return np.apply_along_axis(lambda ch: signal.filtfilt(b, a, ch), 0, data)


def remove_artifacts(data: np.ndarray, threshold_uv: float = 100.0) -> np.ndarray:
    """
    Remove artifact epochs using amplitude thresholding.
    Epochs exceeding threshold are zeroed (simple rejection).

    Args:
        data: EEG signal (1D array)
        threshold_uv: Amplitude threshold in microvolts

    Returns:
        Cleaned signal with artifact regions zeroed
    """
    cleaned = data.copy()
    artifact_mask = np.abs(cleaned) > threshold_uv
    cleaned[artifact_mask] = 0.0
    return cleaned


def normalize_signal(data: np.ndarray) -> np.ndarray:
    """
    Z-score normalize EEG signal (zero mean, unit variance).

    Args:
        data: EEG signal array

    Returns:
        Normalized signal
    """
    mean = np.mean(data)
    std = np.std(data)
    if std < 1e-8:
        return data - mean
    return (data - mean) / std


def preprocess_eeg(raw_signal: np.ndarray, fs: float = 128.0) -> np.ndarray:
    """
    Full preprocessing pipeline:
      1. Remove artifacts (amplitude clipping)
      2. Bandpass filter (0.5 - 50 Hz) to isolate brainwave range
      3. Z-score normalize

    Args:
        raw_signal: Raw EEG array (1D or 2D: samples x channels)
        fs: Sampling frequency in Hz

    Returns:
        Preprocessed EEG array
    """
    if raw_signal.ndim == 1:
        cleaned = remove_artifacts(raw_signal, threshold_uv=150.0)
        filtered = bandpass_filter(cleaned, lowcut=0.5, highcut=50.0, fs=fs)
        normalized = normalize_signal(filtered)
        return normalized
    else:
        # Process each channel independently
        result = np.zeros_like(raw_signal, dtype=float)
        for ch in range(raw_signal.shape[1]):
            ch_data = raw_signal[:, ch].astype(float)
            cleaned = remove_artifacts(ch_data)
            filtered = bandpass_filter(cleaned, 0.5, 50.0, fs)
            result[:, ch] = normalize_signal(filtered)
        return result
