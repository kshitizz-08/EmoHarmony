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
    Remove artifact epochs using adaptive amplitude thresholding.
    Uses median ± 5×IQR per channel — robust to different EEG device
    voltage scales (μV-calibrated vs raw ADC counts).

    Fixed thresholds (e.g. 150 μV) fail on uncalibrated recordings where
    valid signal amplitude can be in the thousands of ADC units.

    Args:
        data: EEG signal (1D array)
        threshold_uv: Ignored — kept for API compatibility.
                      Threshold is now computed adaptively.

    Returns:
        Cleaned signal with artifact regions replaced by channel median
    """
    cleaned = data.copy().astype(float)
    if cleaned.ndim == 1:
        median = np.median(cleaned)
        q1, q3 = np.percentile(cleaned, [25, 75])
        iqr = q3 - q1
        threshold = 5.0 * iqr if iqr > 1e-8 else 150.0
        artifact_mask = np.abs(cleaned - median) > threshold
        cleaned[artifact_mask] = median      # replace with median, not zero
    else:
        for ch in range(cleaned.shape[1]):
            col = cleaned[:, ch]
            median = np.median(col)
            q1, q3 = np.percentile(col, [25, 75])
            iqr = q3 - q1
            threshold = 5.0 * iqr if iqr > 1e-8 else 150.0
            mask = np.abs(col - median) > threshold
            cleaned[mask, ch] = median
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
    EEG preprocessing pipeline for feature extraction:
      1. Remove artifacts (amplitude clipping)
      2. Bandpass filter (0.5 - 50 Hz) to isolate brainwave range

    NOTE: Z-score normalization is intentionally NOT applied here.
    Band power features (used by the ML models) are based on relative
    frequency-domain energy. Normalizing the time-domain signal to
    unit variance collapses all amplitude differences between emotions,
    causing the model to always predict the same (dominant) class.

    Args:
        raw_signal: Raw EEG array (1D or 2D: samples x channels)
        fs: Sampling frequency in Hz

    Returns:
        Preprocessed EEG array (filtered, artifact-free)
    """
    if raw_signal.ndim == 1:
        cleaned = remove_artifacts(raw_signal, threshold_uv=150.0)
        filtered = bandpass_filter(cleaned, lowcut=0.5, highcut=50.0, fs=fs)
        return filtered
    else:
        # Process each channel independently
        result = np.zeros_like(raw_signal, dtype=float)
        for ch in range(raw_signal.shape[1]):
            ch_data = raw_signal[:, ch].astype(float)
            cleaned = remove_artifacts(ch_data)
            filtered = bandpass_filter(cleaned, 0.5, 50.0, fs)
            result[:, ch] = filtered
        return result
