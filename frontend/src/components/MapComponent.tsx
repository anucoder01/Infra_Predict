"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapComponent({ assets, alerts }: { assets: any[], alerts: any[] }) {
  useEffect(() => {
    // any initialization if needed
  }, []);

  const getMarkerIcon = (assetId: string) => {
    const hasAlert = alerts.some(a => a.asset_id === assetId && a.severity === 'high');
    return hasAlert ? redIcon : customIcon;
  };

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden glass">
      <MapContainer center={[37.7749, -122.4194]} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {assets.map((asset) => (
          <Marker 
            key={asset.id} 
            position={[asset.location.lat, asset.location.lng]}
            icon={getMarkerIcon(asset.id)}
          >
            <Popup>
              <div className="text-gray-900">
                <strong>{asset.name}</strong><br/>
                Type: {asset.type}<br/>
                Health: {asset.health}%
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
