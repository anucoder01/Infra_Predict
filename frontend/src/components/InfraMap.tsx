import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Asset, SensorData } from '../hooks/useInfraData';

const MAP_CENTER: [number, number] = [20.0, 0.0];
const ZOOM = 3;

interface InfraMapProps {
  assets: Asset[];
  activeAsset: string | null;
  setActiveAsset: (id: string) => void;
  latestSensors: Record<string, SensorData>;
}

// A simple component to fly the map when activeAsset changes
function MapFlyTo({ assets, activeAsset }: { assets: Asset[], activeAsset: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (activeAsset) {
      const asset = assets.find(a => a.id === activeAsset);
      if (asset) {
        map.flyTo([asset.location.lat, asset.location.lng], map.getZoom(), {
          animate: true,
          duration: 1
        });
      }
    }
  }, [activeAsset, assets, map]);
  return null;
}

export default function InfraMap({ assets, activeAsset, setActiveAsset, latestSensors }: InfraMapProps) {
  const [isDark, setIsDark] = useState(false);
  const [mapMode, setMapMode] = useState<'health' | 'thermal' | 'vibration'>('health');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const getMarkerColor = (asset: Asset) => {
    if (mapMode === 'health') {
      if (asset.health >= 80) return '#10b981';
      if (asset.health >= 50) return '#f59e0b';
      return '#ef4444';
    }
    const sensors = latestSensors[asset.id];
    if (!sensors) return '#94a3b8';

    if (mapMode === 'thermal') {
      if (sensors.thermal_c < 30) return '#10b981';
      if (sensors.thermal_c <= 35) return '#f59e0b';
      return '#ef4444';
    }
    if (mapMode === 'vibration') {
      if (sensors.vibration_g < 0.7) return '#10b981';
      if (sensors.vibration_g <= 1.0) return '#f59e0b';
      return '#ef4444';
    }
    return '#10b981';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Healthy';
    if (score >= 50) return 'Warning';
    return 'Critical';
  };

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="relative w-full h-full bg-slate-100 dark:bg-slate-900 z-0">
      <MapContainer center={MAP_CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />
        <MapFlyTo assets={assets} activeAsset={activeAsset} />

        {assets.map(asset => {
          const color = getMarkerColor(asset);
          const isActive = activeAsset === asset.id;
          const isWarningOrCritical = asset.health < 80;

          return (
            <React.Fragment key={asset.id}>
              {isWarningOrCritical && (
                <CircleMarker
                  center={[asset.location.lat, asset.location.lng]}
                  radius={10}
                  fillColor={color}
                  fillOpacity={0.6}
                  stroke={false}
                  pathOptions={{ className: 'map-ring-pulse' }}
                />
              )}
              <CircleMarker
                center={[asset.location.lat, asset.location.lng]}
                radius={isActive ? 14 : 10}
                fillColor={color}
                fillOpacity={0.85}
                color={color}
                weight={isActive ? 2 : 0}
                eventHandlers={{ click: () => setActiveAsset(asset.id) }}
              >
                <Popup>
                  <div className="text-slate-800 font-sans">
                    <strong>{asset.name}</strong><br/>
                    Health: {asset.health.toFixed(0)}%<br/>
                    Status: {getHealthLabel(asset.health)}
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Layer Controls */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md shadow-sm p-1 md:flex hidden">
        {(['health', 'thermal', 'vibration'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors text-left ${
              mapMode === mode 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-md shadow-sm p-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Healthy (80-100)</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Warning (50-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Critical (&lt;50)</span>
        </div>
      </div>
    </div>
  );
}
