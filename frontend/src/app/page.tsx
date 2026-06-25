"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Topbar from '../components/Topbar';
import AssetPanel from '../components/AssetPanel';
import RightPanel from '../components/RightPanel';
import { useInfraData, SensorData } from '../hooks/useInfraData';

const InfraMap = dynamic(() => import('../components/InfraMap'), { ssr: false });

export default function Dashboard() {
  const { assets, alerts, sensorHistory, activeAsset, setActiveAsset } = useInfraData();

  // Compute the latest sensors for all assets to pass down
  const latestSensors = useMemo(() => {
    const latest: Record<string, SensorData> = {};
    for (const asset of assets) {
      const history = sensorHistory[asset.id];
      if (history && history.length > 0) {
        latest[asset.id] = history[history.length - 1].sensors;
      }
    }
    return latest;
  }, [assets, sensorHistory]);

  const highSeverityCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-slate-950 font-sans">
      {/* SECTION 1: TOPBAR */}
      <Topbar alertCount={highSeverityCount} />

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* SECTION 2: ASSET PANEL */}
        <div className="w-full md:w-[260px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/20 md:h-full h-[180px] md:h-auto overflow-hidden">
          <AssetPanel 
            assets={assets} 
            activeAsset={activeAsset} 
            setActiveAsset={setActiveAsset}
            latestSensors={latestSensors}
          />
        </div>

        {/* SECTION 3: MAP (Center) */}
        <div className="flex-1 relative h-[300px] md:h-full shrink-0 md:shrink border-b md:border-b-0 border-slate-200 dark:border-slate-700/20">
          <InfraMap 
            assets={assets} 
            activeAsset={activeAsset} 
            setActiveAsset={setActiveAsset}
            latestSensors={latestSensors}
          />
        </div>

        {/* SECTION 4: RIGHT PANEL (Alerts / Telemetry) */}
        <div className="w-full md:w-[240px] shrink-0 h-[300px] md:h-full overflow-hidden">
          <RightPanel 
            alerts={alerts} 
            assets={assets} 
            activeAsset={activeAsset} 
            sensorHistory={sensorHistory}
            latestSensors={latestSensors}
          />
        </div>

      </div>
    </div>
  );
}
