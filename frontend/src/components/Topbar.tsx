import React from 'react';
import { Building2, RefreshCw, Settings } from 'lucide-react';

interface TopbarProps {
  alertCount: number;
}

export default function Topbar({ alertCount }: TopbarProps) {
  return (
    <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/20 shadow-none shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Building2 size={20} className="text-emerald-600 dark:text-emerald-500" />
          <span className="font-medium text-[15px]">InfraPredict</span>
        </div>
        
        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
        
        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          <div className="w-[7px] h-[7px] rounded-full bg-emerald-500" style={{ animation: 'pulse-dot 2s infinite' }} />
          <span>Live · updating every 2s</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {alertCount > 0 && (
          <div className="flex items-center justify-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[11px] font-medium border border-red-200/50 dark:border-red-500/20">
            {alertCount} high-severity {alertCount === 1 ? 'alert' : 'alerts'}
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <button className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
            <RefreshCw size={16} />
          </button>
          <button className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
