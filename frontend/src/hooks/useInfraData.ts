import { useState, useEffect, useCallback } from 'react';

export interface Asset {
  id: string;
  name: string;
  type: string;
  description?: string;
  location: { lat: number; lng: number };
  health: number;
  baseline_modes?: number[];
  baseline_strain?: number;
}

export interface SensorData {
  acoustic_db: number;
  vibration_g: number;
  thermal_c: number;
  microstrain_ue?: number;
  dominant_freq_hz?: number;
  compensated_freq_hz?: number;
  stiffness_retention_pct?: number;
  spectral_entropy?: number;
  peak_accel_g?: number;
  fatigue_cycles?: number;
}

export interface Reading {
  asset_id: string;
  timestamp: string;
  sensors: SensorData;
  drone_image_url: string;
  prediction?: {
    is_anomaly: boolean;
    severity: string;
    failure_probability: number;
    physics_explanation?: string;
    stiffness_retention_pct?: number;
  };
}

export interface Alert {
  id: string;
  asset_id: string;
  timestamp: string;
  severity: string;
  message: string;
  prediction: {
    is_anomaly: boolean;
    severity: string;
    failure_probability: number;
    physics_explanation?: string;
  };
}

export interface ModalPeak {
  frequency_hz: number;
  power: number;
}

export interface BaselinePeak {
  frequency_hz: number;
  mode: string;
}

export interface SpectrumPoint {
  freq: number;
  psd: number;
}

export interface SpectralData {
  asset_id: string;
  scenario: string;
  scenario_name: string;
  sampling_rate_hz: number;
  detected_peaks: ModalPeak[];
  baseline_peaks: BaselinePeak[];
  spectrum_points: SpectrumPoint[];
  stiffness_retention_pct: number;
}

export function useInfraData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensorHistory, setSensorHistory] = useState<Record<string, Reading[]>>({});
  const [activeAsset, setActiveAsset] = useState<string | null>(null);
  const [spectralData, setSpectralData] = useState<SpectralData | null>(null);
  const [availableScenarios, setAvailableScenarios] = useState<Record<string, any>>({});

  // 1. Fetch available benchmark scenarios once
  useEffect(() => {
    fetch('http://localhost:8001/api/benchmark/scenarios')
      .then(res => res.json())
      .then(data => {
        if (data.scenarios) {
          setAvailableScenarios(data.scenarios);
        }
      })
      .catch(err => console.error("Could not fetch benchmark scenarios", err));
  }, []);

  // 2. Poll global assets and alerts
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [infraRes, alertRes] = await Promise.all([
          fetch('http://localhost:8001/api/infrastructure'),
          fetch('http://localhost:8001/api/alerts')
        ]);
        if (infraRes.ok && alertRes.ok) {
          const infra = await infraRes.json();
          const alertsData = await alertRes.json();
          setAssets(infra.assets);
          setAlerts(alertsData.alerts);

          if (!activeAsset && infra.assets.length > 0) {
            setActiveAsset(infra.assets[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch infra data", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 2000);
    return () => clearInterval(interval);
  }, [activeAsset]);

  // 3. Poll sensors & spectral data for active asset
  useEffect(() => {
    if (!activeAsset) return;

    const fetchAssetData = async () => {
      try {
        const [sensorRes, spectrumRes] = await Promise.all([
          fetch(`http://localhost:8001/api/infrastructure/${activeAsset}/sensors`),
          fetch(`http://localhost:8001/api/infrastructure/${activeAsset}/spectrum`)
        ]);

        if (sensorRes.ok) {
          const data = await sensorRes.json();
          setSensorHistory(prev => ({ ...prev, [activeAsset]: data.readings }));
        }

        if (spectrumRes.ok) {
          const specData = await spectrumRes.json();
          setSpectralData(specData);
        }
      } catch (err) {
        console.error("Failed to fetch asset telemetry/spectrum", err);
      }
    };

    fetchAssetData();
    const interval = setInterval(fetchAssetData, 2000);
    return () => clearInterval(interval);
  }, [activeAsset]);

  // 4. Inject benchmark damage scenario
  const injectDamageScenario = useCallback(async (assetId: string, scenarioKey: string) => {
    try {
      const res = await fetch('http://localhost:8001/api/benchmark/inject_damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId, scenario_key: scenarioKey })
      });
      if (res.ok) {
        // Immediate refresh of spectral data and sensors
        const [sensorRes, specRes] = await Promise.all([
          fetch(`http://localhost:8001/api/infrastructure/${assetId}/sensors`),
          fetch(`http://localhost:8001/api/infrastructure/${assetId}/spectrum`)
        ]);
        if (sensorRes.ok) {
          const sData = await sensorRes.json();
          setSensorHistory(prev => ({ ...prev, [assetId]: sData.readings }));
        }
        if (specRes.ok) {
          const spData = await specRes.json();
          setSpectralData(spData);
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to inject scenario", e);
    }
    return false;
  }, []);

  return {
    assets,
    alerts,
    sensorHistory,
    activeAsset,
    setActiveAsset,
    spectralData,
    availableScenarios,
    injectDamageScenario
  };
}
