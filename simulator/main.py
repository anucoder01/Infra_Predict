import time
import requests
import sys
import os

# Add parent directory to sys.path so simulator can import shm_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.shm_engine.structural_physics import StructuralDynamicsSimulator
from backend.shm_engine.benchmark_loader import BENCHMARK_ASSETS, DAMAGE_SCENARIOS

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001/api/ingest")

def main():
    print("=" * 70)
    print("🚀 InfraPredict SHM Telemetry Simulator v2.0 (Phase 1 Engine)")
    print("   Streaming multi-modal structural dynamics: Modal Vibration (FFT),")
    print("   Microstrain (uE), Acoustic Emission, and Thermal Decoupling.")
    print("=" * 70)
    print(f"Target Ingestion API: {BACKEND_URL}")
    print(f"Monitored Benchmark Assets: {[a['id'] for a in BENCHMARK_ASSETS]}")

    sim = StructuralDynamicsSimulator()
    step_counter = 0

    while True:
        step_counter += 1

        # Periodic demonstration of realistic scenario events:
        # Every 25 steps (~2.5 minutes), introduce an overload event or minor damage on Z24
        if step_counter == 10:
            print("\n[SCENARIO EVENT] Simulating Pier Subsidence (10mm) on bridge-z24...")
            sim.set_damage_scenario("bridge-z24", "pier_settlement_10mm")
        elif step_counter == 25:
            print("\n[SCENARIO EVENT] Simulating Concrete Fatigue Shear Cracking on bridge-z24...")
            sim.set_damage_scenario("bridge-z24", "concrete_fatigue_crack")
        elif step_counter == 45:
            print("\n[SCENARIO EVENT] Maintenance Crew Remediated bridge-z24 -> Resetting to Undamaged Baseline.")
            sim.set_damage_scenario("bridge-z24", "normal")
            step_counter = 0

        for asset in BENCHMARK_ASSETS:
            asset_id = asset["id"]
            telemetry = sim.generate_telemetry_batch(asset_id, n_samples=64)

            payload = {
                "asset_id": asset_id,
                "timestamp": telemetry["timestamp"],
                "sensors": telemetry["sensors"],
                "drone_image_url": f"https://mock-drone-images.com/{asset_id}/{int(time.time())}.jpg",
                "raw_accel_waveform": telemetry["raw_accel_waveform"],
                "scenario": telemetry["scenario"]
            }

            try:
                response = requests.post(BACKEND_URL, json=payload, timeout=3)
                if response.status_code == 200:
                    pred = response.json().get("prediction", {})
                    status_flag = "⚠️ ANOMALY" if pred.get("is_anomaly") else "✅ OK"
                    f0 = telemetry["sensors"]["dominant_freq_hz"]
                    stiffness = telemetry["sensors"]["stiffness_retention_pct"]
                    strain = telemetry["sensors"]["microstrain_ue"]

                    print(
                        f"[{telemetry['timestamp'][11:19]}] {asset_id:<15} | "
                        f"f₀: {f0:4.2f}Hz | K: {stiffness:5.1f}% | Strain: {strain:5.0f}uE | "
                        f"{status_flag} (FailProb: {pred.get('failure_probability', 0)*100:.0f}%)"
                    )
                else:
                    print(f"[{telemetry['timestamp'][11:19]}] HTTP {response.status_code} for {asset_id}")
            except requests.exceptions.RequestException as e:
                print(f"[{telemetry['timestamp'][11:19]}] Ingestion unreachable for {asset_id}: {e.__class__.__name__}")

        # Stream cycle pause: 3 seconds for responsive live telemetry
        time.sleep(3.0)

if __name__ == "__main__":
    main()
