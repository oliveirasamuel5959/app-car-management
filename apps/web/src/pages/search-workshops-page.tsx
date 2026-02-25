import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import { CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function SearchWorkshopsPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setUserLocation({ lat, lng });

        const query = `
          [out:json];
          (
            node["shop"="car_repair"](around:5000,${lat},${lng});
            way["shop"="car_repair"](around:5000,${lat},${lng});
          );
          out center;
        `;

        try {
          const response = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
              method: "POST",
              body: query,
            }
          );

          const data = await response.json();

          const formatted = data.elements.map((el) => ({
            id: el.id,
            name: el.tags?.name || "Unnamed Workshop",
            lat: el.lat || el.center?.lat,
            lng: el.lon || el.center?.lon,
          }));

          setWorkshops(formatted);
        } catch (err) {
          setError("Failed to load workshops.");
        }
      },
      () => {
        setError("Unable to retrieve location.");
      }
    );
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="flex flex-col items-center space-y-6">

          {/* Spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>

          {/* Text */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Detecting your location
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Please allow location access to find nearby workshops
            </p>
          </div>

        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={10}
          pathOptions={{
            color: "#eb3c25",      // borda
            fillColor: "#eb3c25",  // preenchimento
            fillOpacity: 1,
          }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>

        {/* Workshop Markers */}
        {workshops.map((shop) => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]}>
            <Popup>{shop.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default SearchWorkshopsPage;