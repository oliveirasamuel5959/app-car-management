import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  Visibility as ViewedIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import type { Schedule, ScheduleStatus } from '../../services/schedule-service';
import { scheduleService } from '../../services/schedule-service';

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

  useEffect(() => {
    fetchSchedules();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

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
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
