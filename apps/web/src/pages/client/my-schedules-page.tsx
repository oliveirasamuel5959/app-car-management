import { useEffect, useState } from 'react';
import { useRealtime } from '../../context/realtime-context';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  Button,
  Rating,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  Visibility as ViewedIcon,
  Pending as PendingIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import type { Schedule, ScheduleStatus } from '../../services/schedule-service';
import { scheduleService } from '../../services/schedule-service';
import type { WorkshopRating } from '../../services/workshop-rating-service';
import { workshopRatingService } from '../../services/workshop-rating-service';
import RatingModal from './rating-modal';

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: 'warning' | 'info' | 'success' | 'error'; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', color: 'warning', icon: <PendingIcon fontSize="small" /> },
  visualizado: { label: 'Visualizado', color: 'info', icon: <ViewedIcon fontSize="small" /> },
  aceito: { label: 'Aceito', color: 'success', icon: <AcceptedIcon fontSize="small" /> },
  recusado: { label: 'Recusado', color: 'error', icon: <RejectedIcon fontSize="small" /> },
};

const TYPE_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  reparo: 'Reparo',
  inspecao: 'Inspeção',
  outro: 'Outro',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function MySchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRatings, setMyRatings] = useState<Map<number, WorkshopRating>>(new Map());
  const [modalSchedule, setModalSchedule] = useState<Schedule | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduleService.listForClient();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRatings = async () => {
    try {
      const data = await workshopRatingService.listMine();
      const ratings = Array.isArray(data) ? data : [];
      const map = new Map<number, WorkshopRating>();
      for (const r of ratings) {
        if (r.schedule_id !== null) map.set(r.schedule_id, r);
      }
      setMyRatings(map);
    } catch {
      // Non-fatal — rating actions simply won't show
      setMyRatings(new Map());
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchMyRatings();
  }, []);

  // Live reload when the workshop accepts/rejects a schedule
  const { subscribe } = useRealtime();
  useEffect(() => {
    return subscribe('schedule_status_change', () => {
      fetchSchedules();
    });
  }, [subscribe]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  const modalRating = modalSchedule ? myRatings.get(modalSchedule.id) : undefined;

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          Meus Agendamentos
        </Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={fetchSchedules} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {schedules.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <ScheduleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum agendamento encontrado
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Seus agendamentos aparecerão aqui quando você solicitar um serviço.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {schedules.map((s) => {
            const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pendente;
            const myRating = s.status === 'aceito' ? myRatings.get(s.id) : undefined;
            return (
              <Card key={s.id} variant="outlined" sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {TYPE_LABELS[s.service_request_type] ?? s.service_request_type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {s.problem_description.length > 80
                          ? s.problem_description.slice(0, 80) + '…'
                          : s.problem_description}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatDateTime(s.scheduled_at)}
                      </Typography>
                    </Stack>
                    <Chip
                      icon={cfg.icon}
                      label={cfg.label}
                      color={cfg.color}
                      variant="outlined"
                      size="small"
                      sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 600 }}
                    />
                  </Stack>

                  {s.status === 'aceito' && (
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<StarIcon />}
                        onClick={() => setModalSchedule(s)}
                      >
                        {myRating ? 'Editar Avaliação' : 'Avaliar'}
                      </Button>
                      {myRating && (
                        <Rating value={myRating.rating} readOnly size="small" />
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {modalSchedule && (
        <RatingModal
          open
          scheduleId={modalRating ? null : modalSchedule.id}
          scheduleLabel={`${TYPE_LABELS[modalSchedule.service_request_type] ?? modalSchedule.service_request_type} • ${formatDateTime(modalSchedule.scheduled_at)}`}
          existing={modalRating ?? null}
          onClose={() => setModalSchedule(null)}
          onSaved={() => {
            setModalSchedule(null);
            fetchSchedules();
            fetchMyRatings();
          }}
        />
      )}
    </Box>
  );
}
