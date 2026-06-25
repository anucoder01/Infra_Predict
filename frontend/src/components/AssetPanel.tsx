import React from 'react';
import { Asset, SensorData } from '../hooks/useInfraData';
import { MapPin, Droplet, Zap, Building2 } from 'lucide-react';

interface AssetPanelProps {
  assets: Asset[];
  activeAsset: string | null;
  setActiveAsset: (id: string) => void;
  latestSensors: Record<string, SensorData>; // We might need to derive this from sensorHistory
}

const healthColor = (score: number) => {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 50) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
};

const getAssetIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'bridge': return <MapPin size={16} className="text-slate-500" />;
    case 'pipeline': return <Droplet size={16} className="text-slate-500" />;
    case 'powerline': return <Zap size={16} className="text-slate-500" />;
    default: return <Building2 size={16} className="text-slate-500" />;
  }
};

const getHealthLabel = (score: number) => {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'Warning';
  return 'Critical';
};

const getAcousticColor = (val: number) => {
  if (val < 60) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (val <= 80) return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
};

const getVibrationColor = (val: number) => {
  if (val < 0.7) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (val <= 1.0) return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
};

const getThermalColor = (val: number) => {
  if (val < 30) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (val <= 35) return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
};

export default function AssetPanel({ assets, activeAsset, setActiveAsset, latestSensors }: AssetPanelProps) {
  const healthyCount = assets.filter(a => a.health >= 80).length;
  const criticalCount = assets.filter(a => a.health < 50).length;

  return (
    <div className="w-full md:w-[260px] flex flex-col border-r border-slate-200 dark:border-slate-700/20 bg-white dark:bg-slate-900 shrink-0 h-full overflow-y-auto">
      {/* Summary stat row */}
      <div className="flex gap-2 p-4 border-b border-slate-200 dark:border-slate-700/20">
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-md py-2">
          <div className="text-[16px] font-medium text-slate-700 dark:text-slate-200">{assets.length}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Total</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-md py-2">
          <div className="text-[16px] font-medium text-emerald-600 dark:text-emerald-400">{healthyCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Healthy</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-md py-2">
          <div className="text-[16px] font-medium text-red-600 dark:text-red-400">{criticalCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Critical</div>
        </div>
      </div>

      {/* Asset cards */}
      <div className="flex flex-col p-2 gap-2">
        {assets.map(asset => {
          const isActive = activeAsset === asset.id;
          const sensors = latestSensors[asset.id];

          return (
            <div
              key={asset.id}
              onClick={() => setActiveAsset(asset.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                isActive 
                  ? 'border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-800/50' 
                  : 'border-slate-200/20 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
            >
              {/* Icon row */}
              <div className="flex items-center gap-2 mb-2">
                {getAssetIcon(asset.type)}
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{asset.name}</span>
                <span className="text-[11px] text-slate-500 ml-auto">{asset.id}</span>
              </div>

              {/* Health Label */}
              <div className="flex justify-end text-[11px] mb-1 font-medium" style={{ color: healthColor(asset.health) }}>
                {getHealthLabel(asset.health)} {asset.health.toFixed(0)}%
              </div>

              {/* Health Bar */}
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 overflow-hidden">
                <div 
                  className="h-full rounded-full health-bar" 
                  style={{ 
                    width: `${asset.health}%`, 
                    backgroundColor: healthColor(asset.health) 
                  }} 
                />
              </div>

              {/* Sensor Pills Row */}
              <div className="flex gap-1">
                {sensors ? (
                  <>
                    <div className={`flex-1 text-center py-0.5 rounded text-[10px] font-medium ${getAcousticColor(sensors.acoustic_db)}`}>
                      {sensors.acoustic_db.toFixed(0)}dB
                    </div>
                    <div className={`flex-1 text-center py-0.5 rounded text-[10px] font-medium ${getVibrationColor(sensors.vibration_g)}`}>
                      {sensors.vibration_g.toFixed(2)}G
                    </div>
                    <div className={`flex-1 text-center py-0.5 rounded text-[10px] font-medium ${getThermalColor(sensors.thermal_c)}`}>
                      {sensors.thermal_c.toFixed(1)}°C
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-slate-400 italic">Waiting for data...</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
