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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  EventNote as ScheduleIcon,
} from '@mui/icons-material';
import type { Schedule, ScheduleStatus } from '../../services/schedule-service';
import { scheduleService } from '../../services/schedule-service';

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: 'warning' | 'info' | 'success' | 'error' }> = {
  pendente: { label: 'Pendente', color: 'warning' },
  visualizado: { label: 'Visualizado', color: 'info' },
  aceito: { label: 'Aceito', color: 'success' },
  recusado: { label: 'Recusado', color: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  reparo: 'Reparo',
  inspecao: 'Inspeção',
  outro: 'Outro',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function WorkshopSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail modal
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduleService.listForWorkshop();
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

  const openDetail = async (schedule: Schedule) => {
    setSelected(schedule);
    setModalOpen(true);
    // Fire view in background — mark as viewed
    if (schedule.status === 'pendente') {
      try {
        const updated = await scheduleService.view(schedule.id);
        setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setSelected(updated);
      } catch {
        // Silently fail — view is best-effort
      }
    }
  };

  const closeDetail = () => {
    setModalOpen(false);
    setSelected(null);
    setSuccess(null);
  };

  const handleAction = async (action: 'accept' | 'reject') => {
    if (!selected) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated =
        action === 'accept'
          ? await scheduleService.accept(selected.id)
          : await scheduleService.reject(selected.id);
      setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelected(updated);
      setSuccess(action === 'accept' ? 'Agendamento aceito com sucesso!' : 'Agendamento recusado.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const terminal = selected?.status === 'aceito' || selected?.status === 'recusado';

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
          Agendamentos
        </Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={fetchSchedules} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {schedules.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <ScheduleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum agendamento recebido
            </Typography>
            <Typography variant="body2" color="text.disabled">
              As solicitações de agendamento dos clientes aparecerão aqui.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {schedules.map((s) => {
            const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pendente;
            return (
              <Card
                key={s.id}
                variant="outlined"
                sx={{ cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}
                onClick={() => openDetail(s)}
              >
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {TYPE_LABELS[s.service_request_type] ?? s.service_request_type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 400 }}>
                        {s.problem_description}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {fmt(s.scheduled_at)} • {s.contact_phone}
                      </Typography>
                    </Stack>
                    <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 600, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              {TYPE_LABELS[selected.service_request_type] ?? selected.service_request_type}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ mt: 1 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.disabled">Descrição do problema</Typography>
                  <Typography variant="body1">{selected.problem_description}</Typography>
                </Box>

                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Data/Hora</Typography>
                    <Typography variant="body2">{fmt(selected.scheduled_at)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Contato</Typography>
                    <Typography variant="body2">{selected.contact_phone}</Typography>
                    <Typography variant="body2">{selected.contact_email}</Typography>
                  </Box>
                </Stack>

                <Box>
                  <Typography variant="caption" color="text.disabled">Status</Typography>
                  <Chip
                    label={(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pendente).label}
                    color={(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pendente).color}
                    size="small"
                    sx={{ mt: 0.5, fontWeight: 600 }}
                  />
                </Box>

                {selected.viewed_at && (
                  <Typography variant="caption" color="text.disabled">
                    Visualizado em {fmt(selected.viewed_at)}
                  </Typography>
                )}
                {selected.responded_at && (
                  <Typography variant="caption" color="text.disabled">
                    Respondido em {fmt(selected.responded_at)}
                  </Typography>
                )}

                {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeDetail} color="inherit">
                Fechar
              </Button>
              {!terminal && (
                <>
                  <Button
                    onClick={() => handleAction('reject')}
                    color="error"
                    variant="outlined"
                    startIcon={<RejectIcon />}
                    disabled={actionLoading}
                  >
                    Recusar
                  </Button>
                  <Button
                    onClick={() => handleAction('accept')}
                    color="success"
                    variant="contained"
                    startIcon={<AcceptIcon />}
                    disabled={actionLoading}
                  >
                    Aceitar
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
