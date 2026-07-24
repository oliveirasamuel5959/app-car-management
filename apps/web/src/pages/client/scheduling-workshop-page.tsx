import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Place as PlaceIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { Workshop } from '../../services/workshop-service';
import { workshopService } from '../../services/workshop-service';
import type { AgendaDay, ServiceRequestType } from '../../services/schedule-service';
import { scheduleService } from '../../services/schedule-service';

const REQUEST_TYPES: { value: ServiceRequestType; label: string }[] = [
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reparo', label: 'Reparo' },
  { value: 'inspecao', label: 'Inspeção' },
  { value: 'outro', label: 'Outro' },
];

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function weekdaysLabel(csv: string | null): string {
  if (!csv) return '';
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const nums = csv.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => n >= 1 && n <= 7);
  return nums.length ? nums.map((n) => labels[n - 1]).join(', ') : '';
}

function timeLabel(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

/** True if the workshop has all the fields needed to compute an agenda. */
function hasOperatingHours(w: Workshop): boolean {
  return !!(w.opening_time && w.closing_time && w.work_days);
}

export default function SchedulingWorkshopPage() {
  const { workshopId } = useParams<{ workshopId: string }>();
  const navigate = useNavigate();

  // Workshop data
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [agenda, setAgenda] = useState<AgendaDay[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Booking modal
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [form, setForm] = useState({
    service_request_type: 'manutencao' as ServiceRequestType,
    problem_description: '',
    contact_phone: '',
    contact_email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const wId = workshopId ? parseInt(workshopId, 10) : 0;

  // Fetch workshop by ID — use the dedicated endpoint, not search
  useEffect(() => {
    if (!wId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await workshopService.getWorkshopById(wId);
        setWorkshop(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Oficina não encontrada');
      } finally {
        setLoading(false);
      }
    })();
  }, [wId]);

  // Build calendar days for current month
  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calMonth]);

  // Fetch agenda when month changes (only if workshop has operating hours)
  useEffect(() => {
    if (!wId || !workshop || !hasOperatingHours(workshop)) return;
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    (async () => {
      try {
        setAgendaLoading(true);
        const data = await scheduleService.getAgenda(wId, dateFrom, dateTo);
        setAgenda(data.days ?? []);
      } catch {
        setAgenda([]);
      } finally {
        setAgendaLoading(false);
      }
    })();
  }, [wId, calMonth, workshop]);

  const agendaMap = useMemo(() => {
    const map = new Map<string, AgendaDay>();
    for (const d of agenda) map.set(d.date, d);
    return map;
  }, [agenda]);

  const handlePrevMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1));

  const handleSelectDay = (day: number) => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayInfo = agendaMap.get(dateStr);
    if (!dayInfo || !dayInfo.is_open) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  const openBooking = () => {
    setFormErrors({});
    setBookingSuccess(false);
    setBookingOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.problem_description.trim()) errs.problem_description = 'Descreva o problema';
    if (!form.contact_phone.trim()) errs.contact_phone = 'Obrigatório';
    if (!form.contact_email.trim()) errs.contact_email = 'Obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) errs.contact_email = 'Email inválido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitBooking = async () => {
    if (!validateForm() || !selectedDate || !selectedSlot) return;
    setBookingSubmitting(true);
    try {
      const scheduledAt = `${selectedDate}T${selectedSlot}:00`;
      await scheduleService.create({
        workshop_id: wId,
        service_request_type: form.service_request_type,
        problem_description: form.problem_description,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        scheduled_at: scheduledAt,
      });
      setBookingSuccess(true);
      // Refresh agenda shortly
      setTimeout(() => {
        setBookingOpen(false);
        setCalMonth(new Date(calMonth));
      }, 1500);
    } catch (err: unknown) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'Erro ao criar agendamento' });
    } finally {
      setBookingSubmitting(false);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !workshop) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto', px: 2, mt: 4 }}>
        <Alert severity="error">{error ?? 'Oficina não encontrada'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/client/scheduling')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  const selectedDayInfo = selectedDate ? agendaMap.get(selectedDate) : null;
  const selectedSlotBusy =
    selectedSlot && selectedDayInfo
      ? selectedDayInfo.slots.find((s) => s.time === selectedSlot)?.busy ?? false
      : false;

  const canBook = hasOperatingHours(workshop);

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 2, md: 0 } }}>
      {/* Back + header */}
      <Button startIcon={<BackIcon />} onClick={() => navigate('/client/scheduling')} sx={{ mb: 2 }}>
        Voltar
      </Button>

      {/* Workshop info card */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              {workshop.name}
            </Typography>
            {workshop.description && (
              <Typography variant="body2" color="text.secondary">
                {workshop.description}
              </Typography>
            )}

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Chip icon={<StarIcon sx={{ fontSize: 16 }} />} label={workshop.rating_avg.toFixed(1)} size="small" color="warning" variant="outlined" />

              {canBook ? (
                <>
                  <Chip icon={<TimeIcon sx={{ fontSize: 16 }} />} label={`${timeLabel(workshop.opening_time!)} – ${timeLabel(workshop.closing_time!)}`} size="small" variant="outlined" />
                  <Chip label={weekdaysLabel(workshop.work_days!)} size="small" variant="outlined" />
                </>
              ) : (
                <Chip icon={<WarningIcon sx={{ fontSize: 16 }} />} label="Horários não configurados" size="small" color="default" variant="outlined" />
              )}

              {workshop.employee_count != null && workshop.employee_count > 0 && (
                <Chip icon={<PeopleIcon sx={{ fontSize: 16 }} />} label={`${workshop.employee_count} funcionários`} size="small" variant="outlined" />
              )}
            </Stack>

            {(workshop.address || workshop.city || workshop.phone) && (
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                {workshop.address && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PlaceIcon sx={{ fontSize: 16 }} /> {workshop.address}
                  </Typography>
                )}
                {workshop.city && (
                  <Typography variant="caption" color="text.disabled">
                    {workshop.city}{workshop.state ? `, ${workshop.state}` : ''}
                  </Typography>
                )}
                {workshop.phone && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 16 }} /> {workshop.phone}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Calendar + Slots */}
      {!canBook ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <WarningIcon sx={{ fontSize: 56, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Oficina não configurou horários de funcionamento
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400, mx: 'auto' }}>
              Esta oficina ainda não definiu seus dias e horários de atendimento. O agendamento estará disponível assim que a oficina configurar essas informações.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* Calendar */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <IconButton onClick={handlePrevMonth} size="small">{'‹'}</IconButton>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                  </Typography>
                  <IconButton onClick={handleNextMonth} size="small">{'›'}</IconButton>
                </Stack>

                {agendaLoading && (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={24} />
                  </Box>
                )}

                {/* Day-of-week header */}
                <Grid container columns={7} sx={{ mb: 0.5 }}>
                  {WEEKDAYS.map((wd) => (
                    <Grid item xs key={wd} sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.disabled" fontWeight={600}>
                        {wd}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Day cells */}
                <Grid container columns={7}>
                  {calDays.map((day, idx) => {
                    if (day === null) return <Grid item xs key={`empty-${idx}`} />;
                    const year = calMonth.getFullYear();
                    const month = calMonth.getMonth();
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayInfo = agendaMap.get(dateStr);
                    const isOpen = dayInfo?.is_open ?? false;
                    const isSelected = selectedDate === dateStr;
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    const isPast = new Date(year, month, day) < new Date(new Date().toDateString());

                    return (
                      <Grid item xs key={dateStr} sx={{ textAlign: 'center', p: 0.25 }}>
                        <Button
                          onClick={() => handleSelectDay(day)}
                          disabled={isPast || !isOpen}
                          sx={{
                            minWidth: 0,
                            width: '100%',
                            aspectRatio: '1',
                            borderRadius: 2,
                            fontSize: '0.8rem',
                            fontWeight: isToday ? 700 : 400,
                            backgroundColor: isSelected ? 'primary.main' : 'transparent',
                            color: isSelected ? 'primary.contrastText' : isOpen ? 'text.primary' : 'text.disabled',
                            '&:hover': {
                              backgroundColor: isSelected ? 'primary.dark' : isOpen ? 'action.hover' : 'transparent',
                            },
                          }}
                        >
                          {day}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Time slots */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {selectedDate
                    ? `Horários — ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`
                    : 'Selecione uma data'}
                </Typography>

                {!selectedDate && (
                  <Typography variant="body2" color="text.disabled" sx={{ mt: 2 }}>
                    Escolha um dia no calendário para ver os horários disponíveis.
                  </Typography>
                )}

                {selectedDate && selectedDayInfo && !selectedDayInfo.is_open && (
                  <Typography variant="body2" color="text.disabled" sx={{ mt: 2 }}>
                    Oficina fechada neste dia.
                  </Typography>
                )}

                {selectedDate && selectedDayInfo?.is_open && selectedDayInfo.slots.length === 0 && (
                  <Typography variant="body2" color="text.disabled" sx={{ mt: 2 }}>
                    Nenhum horário disponível neste dia.
                  </Typography>
                )}

                {selectedDate && selectedDayInfo?.is_open && selectedDayInfo.slots.length > 0 && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {selectedDayInfo.slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedSlot === slot.time ? 'contained' : 'outlined'}
                        color={slot.busy ? 'inherit' : 'primary'}
                        disabled={slot.busy}
                        onClick={() => setSelectedSlot(slot.time)}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none', opacity: slot.busy ? 0.4 : 1 }}
                        fullWidth
                      >
                        {slot.time}
                        {slot.busy && (
                          <Typography component="span" variant="caption" sx={{ ml: 'auto', color: 'text.disabled' }}>
                            ocupado
                          </Typography>
                        )}
                      </Button>
                    ))}
                  </Stack>
                )}

                {selectedSlot && !selectedSlotBusy && (
                  <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={openBooking}>
                    Agendar {selectedSlot}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Booking Modal */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmar Agendamento</DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 1 }}>
          {bookingSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Agendamento criado com sucesso! A oficina será notificada.
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {selectedDate} às {selectedSlot} • {workshop.name}
              </Typography>

              <TextField
                select
                label="Tipo de serviço"
                value={form.service_request_type}
                onChange={(e) => setForm((f) => ({ ...f, service_request_type: e.target.value as ServiceRequestType }))}
                error={!!formErrors.service_request_type}
                helperText={formErrors.service_request_type}
                fullWidth
                size="small"
              >
                {REQUEST_TYPES.map((rt) => (
                  <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Descrição do problema"
                value={form.problem_description}
                onChange={(e) => setForm((f) => ({ ...f, problem_description: e.target.value }))}
                error={!!formErrors.problem_description}
                helperText={formErrors.problem_description}
                multiline
                rows={3}
                fullWidth
                size="small"
                placeholder="Descreva o que precisa ser feito..."
              />

              <TextField
                label="Telefone de contato"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                error={!!formErrors.contact_phone}
                helperText={formErrors.contact_phone}
                fullWidth
                size="small"
                placeholder="(11) 99999-9999"
              />

              <TextField
                label="Email de contato"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                error={!!formErrors.contact_email}
                helperText={formErrors.contact_email}
                type="email"
                fullWidth
                size="small"
                placeholder="seu@email.com"
              />

              {formErrors.submit && <Alert severity="error">{formErrors.submit}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBookingOpen(false)} color="inherit">Cancelar</Button>
          {!bookingSuccess && (
            <Button onClick={handleSubmitBooking} variant="contained" disabled={bookingSubmitting}>
              {bookingSubmitting ? 'Enviando…' : 'Confirmar Agendamento'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
