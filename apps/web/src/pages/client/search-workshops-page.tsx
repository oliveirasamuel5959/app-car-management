import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import {
  DEFAULT_FILTERS,
  SearchFilterPanel,
  SearchFilters,
} from "./search-filter-panel";
import { WorkshopCard } from "../../components/workshops/workshop-card";
import {
  workshopService,
  WorkshopSearchItem,
} from "../../services/workshop-service";

// Fix marker icons
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PAGE_SIZE = 10;

interface UserLocation {
  lat: number;
  lng: number;
}

export function SearchWorkshopsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(true);
  const [workshops, setWorkshops] = useState<WorkshopSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);

  const hasLocation = userLocation !== null;

  // Locate the user once; on denial the search runs without coordinates.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false),
    );
  }, []);

  const fetchResults = useCallback(async () => {
    if (locating) return;
    setLoading(true);
    setError(null);
    try {
      const data = await workshopService.searchWorkshops({
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        radiusKm: filters.radiusKm,
        minRating: filters.minRating,
        serviceTypes: filters.serviceTypes,
        // Distance sort needs coordinates; fall back to rating.
        sort: hasLocation ? filters.sort : "rating",
        skip,
        limit: PAGE_SIZE,
      });
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setWorkshops([]);
      setError(
        err instanceof Error ? err.message : "Falha ao carregar oficinas",
      );
    } finally {
      setLoading(false);
    }
  }, [locating, userLocation, hasLocation, filters, skip]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Changing any filter resets to the first page.
  useEffect(() => {
    setSkip(0);
  }, [filters]);

  const hasNext = workshops.length === PAGE_SIZE;
  const start = skip + 1;
  const end = skip + workshops.length;

  const mapCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : workshops.length > 0
      ? [workshops[0].latitude, workshops[0].longitude]
      : [-15.78, -47.93]; // fallback center (Brazil)

  if (locating) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Detectando sua localização
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Permita o acesso à localização para buscar oficinas próximas
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)", width: "100%" }}>
      {/* Filters */}
      <Paper
        elevation={2}
        sx={{
          width: 280,
          flexShrink: 0,
          overflowY: "auto",
          borderRadius: 0,
          display: { xs: "none", md: "block" },
        }}
      >
        <SearchFilterPanel
          filters={filters}
          onChange={setFilters}
          hasLocation={hasLocation}
        />
      </Paper>

      {/* Results list */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          bgcolor: "grey.50",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            mb: 2,
          }}
        >
          <SearchFilterPanel
            filters={filters}
            onChange={setFilters}
            hasLocation={hasLocation}
          />
        </Box>

        {!hasLocation && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Localização indisponível — exibindo oficinas por avaliação (sem
            distância).
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" mt={10}>
            <CircularProgress />
          </Box>
        ) : workshops.length === 0 ? (
          <Paper sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma oficina encontrada
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Ajuste os filtros ou aumente o raio de busca.
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Exibindo {start}–{end} {hasNext ? "(há mais resultados)" : ""}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {workshops.map((workshop) => (
                <WorkshopCard
                  key={workshop.id}
                  id={workshop.id}
                  name={workshop.name}
                  description={workshop.description ?? ""}
                  latitude={workshop.latitude}
                  longitude={workshop.longitude}
                  rating_avg={workshop.rating_avg}
                  distance_km={workshop.distance_km}
                  service_types={workshop.service_types}
                  ratings_count={workshop.ratings_count}
                  city={workshop.city}
                  address={workshop.address}
                  onClick={() => navigate(`/client/scheduling/${workshop.id}`)}
                />
              ))}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                mt: 3,
                mb: 2,
              }}
            >
              <Button
                variant="outlined"
                disabled={skip === 0 || loading}
                onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              >
                Anterior
              </Button>
              <Button
                variant="outlined"
                disabled={!hasNext || loading}
                onClick={() => setSkip((s) => s + PAGE_SIZE)}
              >
                Próxima
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* Map */}
      <Box
        sx={{
          width: { xs: 0, md: 360, lg: 420 },
          flexShrink: 0,
          display: { xs: "none", md: "block" },
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={hasLocation ? 13 : 4}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {hasLocation && (
            <CircleMarker
              center={[userLocation!.lat, userLocation!.lng]}
              radius={10}
              pathOptions={{
                color: "#eb3c25",
                fillColor: "#eb3c25",
                fillOpacity: 1,
              }}
            >
              <Popup>Você está aqui</Popup>
            </CircleMarker>
          )}

          {workshops.map((workshop) => (
            <Marker
              key={workshop.id}
              position={[workshop.latitude, workshop.longitude]}
            >
              <Popup>
                <strong>{workshop.name}</strong>
                <br />
                ★ {workshop.rating_avg.toFixed(1)}
                {workshop.distance_km != null && (
                  <>
                    {" "}
                    · {workshop.distance_km.toFixed(1)} km
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>
    </Box>
  );
}

export default SearchWorkshopsPage;
