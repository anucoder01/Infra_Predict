import React, { useState } from 'react';
import { Alert, Asset, SensorData, Reading, SpectralData } from '../hooks/useInfraData';
import { AlertTriangle, CheckCircle2, Activity, Zap, Play, RotateCcw } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis, XAxis, Tooltip, AreaChart, Area } from 'recharts';

interface RightPanelProps {
  alerts: Alert[];
  assets: Asset[];
  activeAsset: string | null;
  sensorHistory: Record<string, Reading[]>;
  latestSensors: Record<string, SensorData>;
  spectralData?: SpectralData | null;
  availableScenarios?: Record<string, any>;
  injectDamageScenario?: (assetId: string, scenarioKey: string) => Promise<any>;
}

export default function RightPanel({
  alerts,
  assets,
  activeAsset,
  sensorHistory,
  latestSensors,
  spectralData,
  availableScenarios = {},
  injectDamageScenario
}: RightPanelProps) {
  const [tab, setTab] = useState<'alerts' | 'telemetry' | 'spectral'>('spectral');
  const [selectedScenario, setSelectedScenario] = useState<string>('normal');
  const [isInjecting, setIsInjecting] = useState<boolean>(false);

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
    thermal: r.sensors.thermal_c,
    microstrain: r.sensors.microstrain_ue || 120
  }));

  const handleApplyScenario = async (scenarioKey: string) => {
    if (!activeAsset || !injectDamageScenario) return;
    setIsInjecting(true);
    setSelectedScenario(scenarioKey);
    await injectDamageScenario(activeAsset, scenarioKey);
    setIsInjecting(false);
  };

  const getStiffnessBadge = (retention?: number) => {
    const val = retention ?? 100;
    if (val >= 90) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (val >= 75) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="w-full md:w-[320px] flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-center">
        <button
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'spectral'
              ? 'text-primary dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setTab('spectral')}
        >
          Spectral (FFT)
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'telemetry'
              ? 'text-primary dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setTab('telemetry')}
        >
          Telemetry
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'alerts'
              ? 'text-primary dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setTab('alerts')}
        >
          Alerts ({alerts.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* TAB 1: SPECTRAL / MODAL ANALYSIS (PHASE 1 CORE) */}
        {tab === 'spectral' && (
          <div className="flex flex-col gap-3">
            {activeAssetData ? (
              <>
                {/* Structural Health & Modal Dynamics Card */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/40">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Activity size={14} className="text-blue-500" />
                        {activeAssetData.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {activeAssetData.description || 'Civil Infrastructure Asset'}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStiffnessBadge(activeSensors?.stiffness_retention_pct)}`}>
                      Stiffness {activeSensors?.stiffness_retention_pct?.toFixed(1) ?? '100'}%
                    </span>
                  </div>

                  {/* Structural KPI Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/40">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Natural f₀</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeSensors?.dominant_freq_hz ? `${activeSensors.dominant_freq_hz.toFixed(2)} Hz` : '--'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Base: {activeAssetData.baseline_modes?.[0] ?? 2.5} Hz
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Strain (µε)</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeSensors?.microstrain_ue ? `${activeSensors.microstrain_ue.toFixed(0)} µε` : '--'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Allow: 500 µε
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Fatigue Cycles</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeSensors?.fatigue_cycles ?? 0}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Rainflow
                      </span>
                    </div>
                  </div>
                </div>

                {/* Power Spectral Density (PSD) FFT Chart */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      Power Spectral Density (PSD)
                    </span>
                    <span className="text-[9px] text-blue-500 font-mono">
                      Welch FFT (50Hz)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2">
                    Resonant frequency response spectrum. A leftward peak shift indicates structural damage.
                  </div>

                  <div className="h-40 w-full">
                    {spectralData && spectralData.spectrum_points.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={spectralData.spectrum_points} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                          <defs>
                            <linearGradient id="psdGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="freq"
                            stroke="#64748b"
                            fontSize={10}
                            tickFormatter={(v) => `${v}Hz`}
                          />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                            formatter={(val: any) => [`${val} x 10⁻³ g²/Hz`, 'Power']}
                            labelFormatter={(label) => `Freq: ${label} Hz`}
                          />
                          {/* Baseline peak indicator */}
                          {activeAssetData.baseline_modes?.[0] && (
                            <ReferenceLine
                              x={activeAssetData.baseline_modes[0]}
                              stroke="#10b981"
                              strokeDasharray="3 3"
                              label={{ value: 'Baseline', position: 'top', fill: '#10b981', fontSize: 9 }}
                            />
                          )}
                          <Area type="monotone" dataKey="psd" stroke="#3b82f6" fillOpacity={1} fill="url(#psdGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Analyzing frequency spectrum...
                      </div>
                    )}
                  </div>

                  {/* Detected Peaks */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/40 text-[10px]">
                    <span className="text-slate-500">Detected Peaks:</span>
                    <div className="flex gap-1.5">
                      {spectralData?.detected_peaks.slice(0, 2).map((peak, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono font-bold">
                          f{i+1}: {peak.frequency_hz.toFixed(2)}Hz
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Benchmark Damage Scenario Injector */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/40">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      Real SHM Damage Benchmark
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">
                    Test how physical structural damage (subsidence, crack opening, overload) shifts resonant frequencies:
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <select
                      value={selectedScenario}
                      onChange={(e) => setSelectedScenario(e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    >
                      {Object.entries(availableScenarios).map(([key, val]: any) => (
                        <option key={key} value={key}>
                          {val.name} ({val.severity.toUpperCase()})
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleApplyScenario(selectedScenario)}
                        disabled={isInjecting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Play size={12} />
                        Apply Damage
                      </button>
                      <button
                        onClick={() => handleApplyScenario('normal')}
                        disabled={isInjecting}
                        className="py-1.5 px-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors"
                        title="Reset to Healthy Baseline"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select an asset on the left to inspect modal spectral dynamics.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RAW TELEMETRY */}
        {tab === 'telemetry' && (
          <div className="flex flex-col h-full">
            {activeAssetData ? (
              <>
                <div className="flex justify-between items-center mb-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500">Acoustic</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {activeSensors ? `${activeSensors.acoustic_db.toFixed(0)} dB` : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500">Vibration</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {activeSensors ? `${activeSensors.vibration_g.toFixed(3)} G` : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500">Thermal</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {activeSensors ? `${activeSensors.thermal_c.toFixed(1)}°C` : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500">Microstrain</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {activeSensors?.microstrain_ue ? `${activeSensors.microstrain_ue.toFixed(0)} µε` : '--'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Microstrain Deformation (µε)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={['dataMin - 20', 'dataMax + 20']} hide />
                        <Line type="monotone" dataKey="microstrain" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <ReferenceLine y={500} stroke="#ef4444" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Acoustic Emission (dB)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                        <Line type="monotone" dataKey="acoustic" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Vibration RMS (G × 100)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={[0, 'dataMax + 20']} hide />
                        <Line type="monotone" dataKey="vibration_scaled" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-16">
                    <div className="text-[10px] font-medium text-slate-500 mb-1">Temperature (°C)</div>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={chartData}>
                        <YAxis domain={['dataMin - 3', 'dataMax + 3']} hide />
                        <Line type="monotone" dataKey="thermal" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs">
                Select an asset to view telemetry
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALERTS */}
        {tab === 'alerts' && (
          <div className="flex flex-col gap-2">
            {displayAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <span className="text-sm font-medium">No active structural alerts</span>
              </div>
            ) : (
              displayAlerts.map(alert => {
                const isHigh = alert.severity === 'high';
                const assetName = assets.find(a => a.id === alert.asset_id)?.name || alert.asset_id;

                return (
                  <div
                    key={alert.id}
                    className={`flex flex-col p-2.5 rounded-md bg-white dark:bg-slate-800 border ${
                      isHigh
                        ? 'border-l-4 border-l-red-500 border-slate-200 dark:border-slate-700'
                        : 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={14} className={isHigh ? 'text-red-500' : 'text-amber-500'} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {assetName}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                      {alert.prediction?.physics_explanation || alert.message}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/40">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isHigh ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        Failure {(alert.prediction.failure_probability * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {hasMoreAlerts && (
              <div className="text-[11px] text-center text-slate-400 pt-1">
                Showing top 8 of {sortedAlerts.length} alerts
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
