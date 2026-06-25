import React, { useState } from 'react';
import { Alert, Asset, SensorData, Reading } from '../hooks/useInfraData';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts';

interface RightPanelProps {
  alerts: Alert[];
  assets: Asset[];
  activeAsset: string | null;
  sensorHistory: Record<string, Reading[]>;
  latestSensors: Record<string, SensorData>;
}

export default function RightPanel({ alerts, assets, activeAsset, sensorHistory, latestSensors }: RightPanelProps) {
  const [tab, setTab] = useState<'alerts' | 'telemetry'>('alerts');

  // Sort alerts: high severity first, then newest first
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (a.severity !== 'high' && b.severity === 'high') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const displayAlerts = sortedAlerts.slice(0, 8);
  const hasMoreAlerts = sortedAlerts.length > 8;

  const activeAssetData = assets.find(a => a.id === activeAsset);
  const activeSensors = activeAsset ? latestSensors[activeAsset] : null;
  
  // Prepare telemetry data
  const history = activeAsset ? (sensorHistory[activeAsset] || []) : [];
  const chartData = history.map(r => ({
    acoustic: r.sensors.acoustic_db,
    vibration_scaled: r.sensors.vibration_g * 100,
    thermal: r.sensors.thermal_c
  }));

  return (
    <div className="w-full md:w-[240px] flex flex-col border-l border-slate-200 dark:border-slate-700/20 bg-white dark:bg-slate-900 shrink-0 h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700/20">
        <button
          className={`flex-1 py-3 text-xs font-medium transition-colors ${
            tab === 'alerts' 
              ? 'text-slate-900 dark:text-slate-100 border-b-2 border-primary' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setTab('alerts')}
        >
          Alerts
        </button>
        <button
          className={`flex-1 py-3 text-xs font-medium transition-colors ${
            tab === 'telemetry' 
              ? 'text-slate-900 dark:text-slate-100 border-b-2 border-primary' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setTab('telemetry')}
        >
          Telemetry
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'alerts' && (
          <div className="flex flex-col gap-2">
            {displayAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400 gap-2">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <span className="text-sm font-medium">No active alerts</span>
              </div>
            ) : (
              displayAlerts.map(alert => {
                const isHigh = alert.severity === 'high';
                const currentSensors = latestSensors[alert.asset_id];
                const assetName = assets.find(a => a.id === alert.asset_id)?.name || alert.asset_id;

                return (
                  <div 
                    key={alert.id} 
                    className={`alert-new flex flex-col p-3 rounded-md bg-white dark:bg-slate-800 border ${
                      isHigh 
                        ? 'border-l-2 border-l-red-500 border-y-slate-200/50 border-r-slate-200/50 dark:border-y-slate-700/30 dark:border-r-slate-700/30' 
                        : 'border-l-2 border-l-amber-500 border-y-slate-200/50 border-r-slate-200/50 dark:border-y-slate-700/30 dark:border-r-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={14} className={isHigh ? 'text-red-500' : 'text-amber-500'} />
                      <span className="text-[12px] font-medium text-slate-900 dark:text-slate-100 truncate">
                        {assetName}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">
                      {currentSensors ? (
                        `Acoustic ${currentSensors.acoustic_db.toFixed(0)}dB · ${currentSensors.thermal_c.toFixed(1)}°C · ${currentSensors.vibration_g.toFixed(2)}G`
                      ) : (
                        alert.message
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                        isHigh ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        Failure {(alert.prediction.failure_probability * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            
            {hasMoreAlerts && (
              <button className="text-[11px] font-medium text-primary hover:text-primary/80 mt-2 text-center w-full">
                View all →
              </button>
            )}
          </div>
        )}

        {tab === 'telemetry' && (
          <div className="flex flex-col h-full">
            {activeAssetData ? (
              <>
                <div className="flex justify-between items-center mb-4 p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Acoustic</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {activeSensors ? activeSensors.acoustic_db.toFixed(0) : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Vibration</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {activeSensors ? activeSensors.vibration_g.toFixed(2) : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Thermal</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {activeSensors ? activeSensors.thermal_c.toFixed(1) : '--'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Acoustic (dB)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                        <Line type="monotone" dataKey="acoustic" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Vibration (G × 100)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={[0, 'dataMax + 50']} hide />
                        <Line type="monotone" dataKey="vibration_scaled" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Thermal (°C)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                        <Line type="monotone" dataKey="thermal" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400 text-sm">
                Select an asset to view telemetry
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
