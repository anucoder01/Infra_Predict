import numpy as np
from typing import Dict, Any, List

# Standard Structural Health Monitoring (SHM) Benchmark Profiles
# Grounded in real civil engineering benchmarks (such as the Swiss Z24 Bridge and LANL frame tests)
BENCHMARK_ASSETS = [
    {
        "id": "bridge-z24",
        "name": "Z24 Benchmark Bridge (Koppigen)",
        "type": "bridge",
        "description": "3-span post-tensioned concrete box girder. The canonical international SHM benchmark.",
        "location": {"lat": 47.1352, "lng": 7.6041},
        "health": 100,
        "baseline_modes": [3.85, 4.90, 9.80], # Hz
        "baseline_strain": 115.0, # microstrain
        "baseline_vibration": 0.065, # g
        "baseline_temp": 18.0, # °C
        "temp_coefficient": -0.015, # Hz/°C
    },
    {
        "id": "bridge-mumbai",
        "name": "Bandra-Worli Sea Link",
        "type": "bridge",
        "description": "Cable-stayed prestressed concrete bridge crossing Mahim Bay.",
        "location": {"lat": 19.0356, "lng": 72.8164},
        "health": 98,
        "baseline_modes": [1.28, 2.45, 4.80],
        "baseline_strain": 185.0,
        "baseline_vibration": 0.082,
        "baseline_temp": 31.0,
        "temp_coefficient": -0.012,
    },
    {
        "id": "bridge-chenab",
        "name": "Chenab Railway Arch Bridge",
        "type": "bridge",
        "description": "World's highest railway steel arch bridge in high-wind deep gorge.",
        "location": {"lat": 33.1519, "lng": 74.8821},
        "health": 100,
        "baseline_modes": [0.85, 1.62, 3.40],
        "baseline_strain": 220.0,
        "baseline_vibration": 0.075,
        "baseline_temp": 15.0,
        "temp_coefficient": -0.010,
    },
    {
        "id": "dam-bhakra",
        "name": "Bhakra Nangal Dam",
        "type": "powerline",
        "description": "Massive concrete gravity dam monitoring crest deflection and hydrostatic load.",
        "location": {"lat": 31.4114, "lng": 76.3268},
        "health": 100,
        "baseline_modes": [4.20, 7.15, 12.30],
        "baseline_strain": 80.0,
        "baseline_vibration": 0.040,
        "baseline_temp": 24.0,
        "temp_coefficient": -0.008,
    },
    {
        "id": "statue-unity",
        "name": "Statue of Unity Structure",
        "type": "building",
        "description": "Tall structural tower with tuned mass dampers and wind load sensors.",
        "location": {"lat": 21.8380, "lng": 73.7191},
        "health": 100,
        "baseline_modes": [0.42, 1.15, 2.80],
        "baseline_strain": 140.0,
        "baseline_vibration": 0.055,
        "baseline_temp": 32.0,
        "temp_coefficient": -0.005,
    },
    {
        "id": "bridge-kinnaur",
        "name": "Bailey Bridge, Kinnaur",
        "type": "bridge",
        "description": "Mountain steel truss bridge damaged by recurring boulder landslides.",
        "location": {"lat": 31.5363, "lng": 78.2618},
        "health": 25,
        "baseline_modes": [2.10, 4.60, 8.90],
        "baseline_strain": 310.0,
        "baseline_vibration": 0.190,
        "baseline_temp": 12.0,
        "temp_coefficient": -0.010,
    },
    {
        "id": "bridge-gg",
        "name": "Golden Gate Bridge",
        "type": "bridge",
        "description": "Suspension bridge with aerodynamic wind and heavy seismic sensor arrays.",
        "location": {"lat": 37.8199, "lng": -122.4783},
        "health": 95,
        "baseline_modes": [0.35, 0.72, 1.48],
        "baseline_strain": 260.0,
        "baseline_vibration": 0.090,
        "baseline_temp": 16.0,
        "temp_coefficient": -0.007,
    },
    {
        "id": "bridge-sydney",
        "name": "Sydney Harbour Bridge",
        "type": "bridge",
        "description": "Steel through arch bridge with 2,400+ wireless structural sensor nodes.",
        "location": {"lat": -33.8523, "lng": 151.2108},
        "health": 97,
        "baseline_modes": [1.12, 2.18, 4.35],
        "baseline_strain": 195.0,
        "baseline_vibration": 0.078,
        "baseline_temp": 21.0,
        "temp_coefficient": -0.009,
    }
]

# Real-world progressive damage injection scenarios
DAMAGE_SCENARIOS = {
    "normal": {
        "name": "Normal Operating Conditions",
        "description": "Undamaged baseline. Ambient traffic and wind excitation.",
        "frequency_shift_pct": 0.0,
        "strain_multiplier": 1.0,
        "vibration_multiplier": 1.0,
        "acoustic_db_offset": 0.0,
        "severity": "low"
    },
    "pier_settlement_10mm": {
        "name": "Pier Settlement (10mm)",
        "description": "Foundation subsidence or soil scour causing downward shift of support. Z24 Step 4.",
        "frequency_shift_pct": -3.6, # f0 drops by 3.6%
        "strain_multiplier": 1.45,
        "vibration_multiplier": 1.25,
        "acoustic_db_offset": 6.0,
        "severity": "medium"
    },
    "pier_settlement_95mm": {
        "name": "Severe Pier Settlement (95mm)",
        "description": "Critical loss of pier bearing support resulting in major redistributive stress. Z24 Step 6.",
        "frequency_shift_pct": -11.2, # f0 drops by 11.2% -> ~21% stiffness loss
        "strain_multiplier": 2.30,
        "vibration_multiplier": 1.95,
        "acoustic_db_offset": 15.0,
        "severity": "high"
    },
    "concrete_fatigue_crack": {
        "name": "Web Concrete Fatigue Cracking",
        "description": "Shear micro-cracks opening in primary concrete box girder under cyclic load.",
        "frequency_shift_pct": -18.5, # f0 drops by 18.5% -> ~34% stiffness loss
        "strain_multiplier": 2.80,
        "vibration_multiplier": 2.20,
        "acoustic_db_offset": 28.0, # High acoustic emission from crack friction
        "severity": "high"
    },
    "cable_slackening": {
        "name": "Cable Stay Tension Loss (-15%)",
        "description": "Corrosion-induced tendon slackening or anchor slippage in stay cables.",
        "frequency_shift_pct": -8.5,
        "strain_multiplier": 1.75,
        "vibration_multiplier": 1.60,
        "acoustic_db_offset": 10.0,
        "severity": "medium"
    },
    "heavy_vehicle_overload": {
        "name": "Extreme Vehicle Overload (Transient)",
        "description": "Unpermitted 120-tonne multi-axle freight transporter crossing span.",
        "frequency_shift_pct": -2.0,
        "strain_multiplier": 3.40, # Massive microstrain spike
        "vibration_multiplier": 2.80,
        "acoustic_db_offset": 18.0,
        "severity": "high"
    }
}
