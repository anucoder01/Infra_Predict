import { useState, useEffect } from 'react';

export interface Asset {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  health: number;
}

export interface SensorData {
  acoustic_db: number;
  vibration_g: number;
  thermal_c: number;
}

export interface Reading {
  asset_id: string;
  timestamp: string;
  sensors: SensorData;
  drone_image_url: string;
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
  };
}

export function useInfraData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensorHistory, setSensorHistory] = useState<Record<string, Reading[]>>({});
  const [activeAsset, setActiveAsset] = useState<string | null>('bridge-01');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [infraRes, alertRes] = await Promise.all([
          fetch('http://localhost:8001/api/infrastructure'),
          fetch('http://localhost:8001/api/alerts')
        ]);
        const infra = await infraRes.json();
        const alertsData = await alertRes.json();
        setAssets(infra.assets);
        setAlerts(alertsData.alerts);
        
        // Auto-select first asset if activeAsset is null and assets exist
        if (!activeAsset && infra.assets.length > 0) {
          setActiveAsset(infra.assets[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch infra data", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 2000);
    return () => clearInterval(interval);
  }, [activeAsset]);

  useEffect(() => {
    if (!activeAsset) return;
    const fetchSensors = async () => {
      try {
        const res = await fetch(`http://localhost:8001/api/infrastructure/${activeAsset}/sensors`);
        if (res.ok) {
          const data = await res.json();
          setSensorHistory(prev => ({ ...prev, [activeAsset]: data.readings }));
        }
      } catch (err) {
        console.error("Failed to fetch sensors", err);
      }
    };
    fetchSensors();
    const interval = setInterval(fetchSensors, 2000);
    return () => clearInterval(interval);
  }, [activeAsset]);

  return { assets, alerts, sensorHistory, activeAsset, setActiveAsset };
}
