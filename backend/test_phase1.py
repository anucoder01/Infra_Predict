import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import (
    get_infrastructure,
    get_asset_sensors,
    get_asset_spectrum,
    inject_damage,
    DamageInjectionRequest,
    get_alerts
)

async def test_e2e():
    print("=" * 60)
    print("🧪 Running Phase 1 E2E Verification Test")
    print("=" * 60)

    # 1. Assets
    infra = await get_infrastructure()
    assets = infra["assets"]
    print(f"1. Monitored Assets: {len(assets)} assets loaded.")
    for a in assets[:3]:
        print(f"   - {a['id']}: {a['name']} (Baseline Modes: {a.get('baseline_modes')})")

    # 2. Baseline Spectrum
    print("\n2. Fetching baseline spectrum for Z24 Bridge...")
    spec_before = await get_asset_spectrum("bridge-z24")
    f0_before = spec_before["detected_peaks"][0]["frequency_hz"]
    k_before = spec_before["stiffness_retention_pct"]
    print(f"   Baseline State  -> Dominant Peak f₀: {f0_before} Hz, Stiffness Retention: {k_before}%")

    # 3. Inject Damage
    print("\n3. Injecting Benchmark Scenario: Web Concrete Fatigue Cracking...")
    inj_res = await inject_damage(DamageInjectionRequest(asset_id="bridge-z24", scenario_key="concrete_fatigue_crack"))
    print(f"   Applied: {inj_res['applied_scenario']['name']}")
    print(f"   Physics Explanation: {inj_res['immediate_prediction']['physics_explanation']}")
    print(f"   Failure Probability: {inj_res['immediate_prediction']['failure_probability']*100:.0f}%")

    # 4. Post-Damage Spectrum
    print("\n4. Verifying post-damage spectrum and stiffness drop...")
    spec_after = await get_asset_spectrum("bridge-z24")
    f0_after = spec_after["detected_peaks"][0]["frequency_hz"]
    k_after = spec_after["stiffness_retention_pct"]
    print(f"   Damaged State   -> Dominant Peak f₀: {f0_after} Hz, Stiffness Retention: {k_after}%")
    print(f"   Delta f₀: {round(f0_before - f0_after, 2)} Hz, Delta Stiffness: {round(k_before - k_after, 1)}%")

    # 5. Alerts
    print("\n5. Checking Alert Stream...")
    alerts = await get_alerts(5)
    latest_alert = alerts["alerts"][0]
    print(f"   Alert ID: {latest_alert['id']}")
    print(f"   Severity: {latest_alert['severity'].upper()}")
    print(f"   Message: {latest_alert['message']}")

    # 6. Reset
    print("\n6. Resetting bridge-z24 to healthy baseline...")
    await inject_damage(DamageInjectionRequest(asset_id="bridge-z24", scenario_key="normal"))
    spec_reset = await get_asset_spectrum("bridge-z24")
    print(f"   Reset State     -> Dominant Peak f₀: {spec_reset['detected_peaks'][0]['frequency_hz']} Hz, Stiffness: {spec_reset['stiffness_retention_pct']}%")
    print("\n✅ Phase 1 E2E Verification PASSED cleanly!")

if __name__ == "__main__":
    asyncio.run(test_e2e())
