import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  Slider,
  Typography,
  InputLabel,
  FormControl,
} from "@mui/material";
import { SERVICE_TYPE_LABELS, WorkshopSort } from "../../services/workshop-service";

export interface SearchFilters {
  radiusKm: number;
  minRating: number | null;
  serviceTypes: string[];
  sort: WorkshopSort;
}

export const DEFAULT_FILTERS: SearchFilters = {
  radiusKm: 10,
  minRating: null,
  serviceTypes: [],
  sort: "distance",
};

const ALL_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);

const SORT_LABELS: Record<WorkshopSort, string> = {
  distance: "Distância",
  rating: "Avaliação",
  reviews: "Nº de avaliações",
};

interface SearchFilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  hasLocation: boolean;
}

export function SearchFilterPanel({
  filters,
  onChange,
  hasLocation,
}: SearchFilterPanelProps) {
  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleServiceType = (type: string) => {
    const selected = filters.serviceTypes.includes(type)
      ? filters.serviceTypes.filter((t) => t !== type)
      : [...filters.serviceTypes, type];
    set("serviceTypes", selected);
  };

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        Filtros
      </Typography>

      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Raio de busca (km)
        </Typography>
        <Slider
          value={filters.radiusKm}
          min={1}
          max={100}
          valueLabelDisplay="auto"
          disabled={!hasLocation}
          onChange={(_, value) => set("radiusKm", value as number)}
        />
      </Box>

      <FormControl fullWidth size="small">
        <InputLabel id="min-rating-label">Nota mínima</InputLabel>
        <Select
          labelId="min-rating-label"
          label="Nota mínima"
          value={filters.minRating === null ? "any" : String(filters.minRating)}
          onChange={(e) =>
            set(
              "minRating",
              e.target.value === "any" ? null : Number(e.target.value),
            )
          }
        >
          <MenuItem value="any">Todas</MenuItem>
          {[4, 3, 2, 1].map((rating) => (
            <MenuItem key={rating} value={String(rating)}>
              {rating}+ estrelas
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Tipo de serviço
        </Typography>
        <FormGroup>
          {ALL_SERVICE_TYPES.map((type) => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  size="small"
                  checked={filters.serviceTypes.includes(type)}
                  onChange={() => toggleServiceType(type)}
                />
              }
              label={SERVICE_TYPE_LABELS[type]}
            />
          ))}
        </FormGroup>
      </Box>

      <FormControl fullWidth size="small">
        <InputLabel id="sort-label">Ordenar por</InputLabel>
        <Select
          labelId="sort-label"
          label="Ordenar por"
          value={hasLocation ? filters.sort : "rating"}
          onChange={(e) => set("sort", e.target.value as WorkshopSort)}
        >
          {(["distance", "rating", "reviews"] as WorkshopSort[]).map((sort) => (
            <MenuItem key={sort} value={sort} disabled={sort === "distance" && !hasLocation}>
              {SORT_LABELS[sort]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
