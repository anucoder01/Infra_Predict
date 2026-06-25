"use client";

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function AlertsPanel({ alerts }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
        <Info className="w-12 h-12 mb-4 opacity-50" />
        <p>No active alerts. Infrastructure is stable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {alerts.map((alert) => (
        <div 
          key={alert.id} 
          className={`p-4 rounded-lg border-l-4 glass transition-all ${
            alert.severity === 'high' ? 'border-red-500 bg-red-900/10' : 
            alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-900/10' : 
            'border-blue-500 bg-blue-900/10'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              {alert.severity === 'high' ? (
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse-glow" />
              ) : alert.severity === 'medium' ? (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              ) : (
                <Info className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-white">
                {alert.asset_id} - {alert.severity.toUpperCase()} Alert
              </h3>
              <div className="mt-1 text-sm text-gray-300">
                <p>{alert.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Detected at: {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
