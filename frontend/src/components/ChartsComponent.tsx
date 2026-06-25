"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ChartsComponent({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-gray-400">No sensor data available</div>;
  }

  // Format timestamp for display
  const formattedData = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString(),
  }));

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickFormatter={(tick) => tick.substring(0, 5)} />
          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#3b82f6', color: '#fff' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="sensors.acoustic_db" name="Acoustic (dB)" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="sensors.vibration_g" name="Vibration (g)" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="sensors.thermal_c" name="Thermal (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
