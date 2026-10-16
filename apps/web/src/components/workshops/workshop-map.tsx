import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
// @ts-expect-error The installed Leaflet package has no declaration file in this project.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WorkshopSearchItem } from '../../services/workshop-service';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface WorkshopMapProps {
  workshops: WorkshopSearchItem[];
  center: [number, number];
  zoom: number;
  userLocation?: { lat: number; lng: number } | null;
  visible: boolean;
}

function MapLayout({ center, visible }: Pick<WorkshopMapProps, 'center' | 'visible'>) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [map, visible]);

  return null;
}

export function WorkshopMap({ workshops, center, zoom, userLocation, visible }: WorkshopMapProps) {
  return (
    <div className="hidden h-[26rem] overflow-hidden rounded-lg border border-border lg:block">
      {/* @ts-expect-error Existing react-leaflet typings in this project reject valid Leaflet map props. */}
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <MapLayout center={center} visible={visible} />
        {/* @ts-expect-error Existing react-leaflet typings in this project reject valid Leaflet layer props. */}
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]}><Popup>Você está aqui</Popup></Marker>}
        {workshops.map((workshop) => <Marker key={workshop.id} position={[workshop.latitude, workshop.longitude]}><Popup><strong>{workshop.name}</strong><br />★ {workshop.rating_avg.toFixed(1)}</Popup></Marker>)}
      </MapContainer>
    </div>
  );
}
