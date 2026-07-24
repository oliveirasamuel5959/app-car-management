import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  InputAdornment,
  Chip,
  Grid,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  MyLocation as LocationIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';
import type { WorkshopSummary } from '../../services/schedule-service';
import { scheduleService } from '../../services/schedule-service';

export default function SchedulingPage() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const fetchWorkshops = async (lat?: number | null, lng?: number | null) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number | undefined> = {
        skip: 0,
        limit: 50,
      };
      if (nameFilter.trim()) params.name = nameFilter.trim();
      if (lat != null && lng != null) {
        params.lat = lat;
        params.lng = lng;
      }
      const data = await scheduleService.searchWorkshops(params);
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load workshops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops(userLat, userLng);
  }, []);

  const handleSearch = () => {
    fetchWorkshops(userLat, userLng);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo navegador.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        setLocating(false);
        fetchWorkshops(lat, lng);
      },
      () => {
        setError('Não foi possível obter sua localização.');
        setLocating(false);
      },
    );
  };

  const weekdaysLabel = (csv: string | null): string => {
    if (!csv) return '—';
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const nums = csv.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => n >= 1 && n <= 7);
    return nums.length ? nums.map((n) => labels[n - 1]).join(', ') : '—';
  };

  const timeLabel = (t: string | null): string => {
    if (!t) return '—';
    return t.slice(0, 5);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Novo Agendamento
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Encontre uma oficina e agende seu serviço
        </Typography>
      </Box>

      {/* Search bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField
          placeholder="Buscar oficina por nome..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          fullWidth
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="outlined"
          startIcon={<LocationIcon />}
          onClick={handleUseLocation}
          disabled={locating}
          sx={{ minWidth: 200, flexShrink: 0 }}
        >
          {locating ? 'Obtendo…' : userLat ? 'Localização ✓' : 'Usar localização'}
        </Button>
        <Button variant="contained" onClick={handleSearch} sx={{ minWidth: 100, flexShrink: 0 }}>
          Buscar
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Workshop list */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : workshops.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <StoreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma oficina encontrada
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Tente ajustar os filtros ou usar uma localização diferente.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {workshops.map((w) => (
            <Grid item xs={12} sm={6} key={w.id}>
              <Card variant="outlined" sx={{ height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}>
                <CardActionArea onClick={() => navigate(`/client/scheduling/${w.id}`)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant="h6" fontWeight={600} noWrap>
                        {w.name}
                      </Typography>

                      {w.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {w.description}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        {w.rating_avg > 0 && (
                          <Chip
                            icon={<StarIcon sx={{ fontSize: 16 }} />}
                            label={w.rating_avg.toFixed(1)}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {w.opening_time && w.closing_time && (
                          <Chip
                            icon={<TimeIcon sx={{ fontSize: 16 }} />}
                            label={`${timeLabel(w.opening_time)} – ${timeLabel(w.closing_time)}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {w.work_days && (
                          <Chip
                            label={weekdaysLabel(w.work_days)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {w.employee_count != null && w.employee_count > 0 && (
                          <Chip
                            icon={<PeopleIcon sx={{ fontSize: 16 }} />}
                            label={`${w.employee_count} func.`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      {w.city && w.state && (
                        <Typography variant="caption" color="text.disabled">
                          {w.city}, {w.state}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
