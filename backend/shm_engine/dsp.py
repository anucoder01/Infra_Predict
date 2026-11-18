import numpy as np
from typing import List, Dict, Any, Tuple

def compute_power_spectral_density(
    accel_samples: List[float],
    sampling_rate: float = 50.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes Power Spectral Density (PSD) using Hanning-windowed FFT.
    Pure NumPy implementation for ultra-fast, zero-overhead computation.
    accel_samples: 1D array of acceleration in 'g' or 'm/s^2'.
    sampling_rate: Sampling frequency in Hz (typically 50-100 Hz in civil SHM).
    Returns (frequencies, psd_values).
    """
    data = np.array(accel_samples, dtype=float)
    if len(data) < 16:
        data = np.pad(data, (0, 16 - len(data)), mode='constant')

    # Remove DC component (gravity / sensor bias)
    data = data - np.mean(data)
    n = len(data)

    # Apply Hanning window to prevent spectral leakage
    window = np.hanning(n)
    windowed_data = data * window

    # Real Fast Fourier Transform
    fft_vals = np.fft.rfft(windowed_data)
    freqs = np.fft.rfftfreq(n, d=1.0 / sampling_rate)

    # Power spectral density normalized by window power
    win_energy = np.sum(window ** 2) + 1e-12
    psd = (np.abs(fft_vals) ** 2) / (sampling_rate * win_energy)

    return freqs, psd

def extract_modal_peaks(
    freqs: np.ndarray,
    psd: np.ndarray,
    max_peaks: int = 3
) -> List[Dict[str, float]]:
    """
    Identifies natural resonant vibration modes (eigenfrequencies) from PSD.
    Returns list of dicts with frequency (Hz) and power amplitude.
    """
    if len(psd) < 4:
        return []

    # Exclude near-zero frequency (DC drift)
    valid_mask = freqs > 0.3
    valid_freqs = freqs[valid_mask]
    valid_psd = psd[valid_mask]

    if len(valid_psd) < 4:
        return []

    max_p = np.max(valid_psd)
    threshold = max_p * 0.08

    peaks = []
    # Identify local maxima
    for i in range(1, len(valid_psd) - 1):
        if valid_psd[i] > valid_psd[i - 1] and valid_psd[i] > valid_psd[i + 1]:
            if valid_psd[i] >= threshold:
                peaks.append({
                    "frequency_hz": round(float(valid_freqs[i]), 2),
                    "power": round(float(valid_psd[i]), 6)
                })

    # If no local maxima exceed threshold, return peak maximum
    if not peaks:
        top_idx = int(np.argmax(valid_psd))
        peaks.append({
            "frequency_hz": round(float(valid_freqs[top_idx]), 2),
            "power": round(float(valid_psd[top_idx]), 6)
        })

    # Sort by power descending and keep top N
    peaks.sort(key=lambda x: x["power"], reverse=True)
    return peaks[:max_peaks]

def compute_stiffness_retention(
    current_freq: float,
    baseline_freq: float
) -> float:
    """
    In structural mechanics, structural stiffness K is proportional to f_0^2.
    Stiffness retention ratio = (f_current / f_baseline)^2 * 100%.
    A drop in resonant frequency directly quantifies loss of structural stiffness.
    """
    if baseline_freq <= 0 or current_freq <= 0:
        return 100.0

    ratio = (current_freq / baseline_freq) ** 2
    return round(float(min(120.0, max(0.0, ratio * 100.0))), 1)

def temperature_compensate_frequency(
    f_measured: float,
    current_temp: float,
    ref_temp: float = 20.0,
    alpha: float = -0.015
) -> float:
    """
    Decouples environmental temperature variations from structural damage.
    Structures expand in heat, softening boundary conditions (typically -0.015 Hz/°C).
    f_compensated = f_measured - alpha * (current_temp - ref_temp).
    """
    f_comp = f_measured - alpha * (current_temp - ref_temp)
    return round(float(f_comp), 2)

def calculate_spectral_entropy(psd: np.ndarray) -> float:
    """
    Normalized spectral entropy:
    Low entropy (< 0.5) indicates clean sinusoidal modal vibration.
    High entropy (> 0.7) indicates broadband noise, rattling, or chaotic crack-breathing impacts.
    """
    psd_norm = psd / (np.sum(psd) + 1e-12)
    psd_norm = psd_norm[psd_norm > 0]
    entropy = -np.sum(psd_norm * np.log2(psd_norm))
    max_entropy = np.log2(len(psd_norm) + 1e-12)
    if max_entropy <= 0:
        return 0.0
    return round(float(min(1.0, max(0.0, entropy / max_entropy))), 3)

def simplified_rainflow_cycles(strain_samples: List[float], bin_threshold: float = 25.0) -> int:
    """
    Counts peak-to-valley stress reversal cycles (ASTM E1049-85 style)
    for fatigue accumulation on strain gauge channels.
    """
    if len(strain_samples) < 3:
        return 0

    arr = np.array(strain_samples)
    diffs = np.diff(arr)
    sign_changes = np.where(np.diff(np.sign(diffs)))[0] + 1
    extrema = arr[sign_changes]

    if len(extrema) < 2:
        return 0

    ranges = np.abs(np.diff(extrema))
    significant_cycles = np.sum(ranges > bin_threshold)
    return int(significant_cycles)
