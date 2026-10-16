import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, MapPin, Star } from 'lucide-react';
import { WorkshopMap } from '../../components/workshops/workshop-map';
import { useRealtime } from '../../context/realtime-context';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import EmptyState from '../../components/ui/empty-state';
import StatusBadge from '../../components/ui/status-badge';
import { FormAlert, Input, Textarea } from '../../components/ui/field';
import { workshopService, SERVICE_TYPE_LABELS } from '../../services/workshop-service';
import type { WorkshopPublic, WorkshopSearchItem, WorkshopSort } from '../../services/workshop-service';
import { scheduleService } from '../../services/schedule-service';
import type { Schedule, ServiceRequestType, WorkshopAgenda } from '../../services/schedule-service';
import { workshopRatingService } from '../../services/workshop-rating-service';
import type { WorkshopRating } from '../../services/workshop-rating-service';
import { SCHEDULE_STATUS_META, TYPE_LABELS, formatDateTime } from '../../lib/status';
import { filterAppointments, getLocalTimezoneOffset, parseAppointmentTab, buildScheduledAt } from '../../lib/appointments';
import RatingModal from './rating-modal';

const REQUEST_TYPES: { value: ServiceRequestType; label: string }[] = [
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reparo', label: 'Reparo' },
  { value: 'inspecao', label: 'Inspeção' },
  { value: 'outro', label: 'Outro' },
];
const SORT_LABELS: Record<WorkshopSort, string> = {
  distance: 'Distância',
  rating: 'Avaliação',
  reviews: 'Número de avaliações',
};
const PAGE_SIZE = 10;
const STEPS = ['Oficina', 'Serviço', 'Data e horário', 'Confirmar'];
type MainTab = 'meus' | 'novo';
type AppointmentBucket = 'proximos' | 'concluidos' | 'cancelados';

interface SearchFilters {
  name: string;
  radiusKm: number;
  minRating: number | null;
  serviceTypes: string[];
  sort: WorkshopSort;
}

const DEFAULT_FILTERS: SearchFilters = {
  name: '',
  radiusKm: 10,
  minRating: null,
  serviceTypes: [],
  sort: 'distance',
};

const FILTER_TABS: { value: AppointmentBucket; label: string }[] = [
  { value: 'proximos', label: 'Próximos' },
  { value: 'concluidos', label: 'Concluídos' },
  { value: 'cancelados', label: 'Cancelados' },
];

function ScheduleList({
  schedules,
  bucket,
  ratings,
  onRate,
  onNew,
}: {
  schedules: Schedule[];
  bucket: AppointmentBucket;
  ratings: Map<number, WorkshopRating>;
  onRate: (schedule: Schedule) => void;
  onNew: () => void;
}) {
  const items = filterAppointments(schedules, bucket);
  if (!items.length) {
    const copy: Record<AppointmentBucket, { title: string; description: string }> = {
      proximos: { title: 'Nenhum agendamento próximo', description: 'Encontre uma oficina e escolha um horário para começar.' },
      concluidos: { title: 'Nenhum serviço concluído', description: 'Os agendamentos aceitos aparecem aqui depois da data marcada.' },
      cancelados: { title: 'Nenhum agendamento cancelado', description: 'Pedidos recusados pela oficina aparecem nesta lista.' },
    };
    return <EmptyState title={copy[bucket].title} description={copy[bucket].description} action="Encontrar uma oficina" onAction={onNew} />;
  }

  return (
    <div className="space-y-3">
      {items.map((schedule) => {
        const rating = ratings.get(schedule.id);
        const pastUnresolved = new Date(schedule.scheduled_at) < new Date() && (schedule.status === 'pendente' || schedule.status === 'visualizado');
        return (
          <article key={schedule.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{TYPE_LABELS[schedule.service_request_type] ?? schedule.service_request_type}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{schedule.problem_description}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateTime(schedule.scheduled_at)}
                </p>
                {pastUnresolved && <p className="mt-1 text-xs text-warning">A oficina ainda não respondeu a este pedido.</p>}
              </div>
              <StatusBadge status={SCHEDULE_STATUS_META[schedule.status]} size="sm" />
            </div>
            {schedule.status === 'aceito' && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => onRate(schedule)}>
                  {rating ? 'Editar avaliação' : 'Avaliar oficina'}
                </Button>
                {rating && <span className="text-sm text-muted-foreground" aria-label={`Sua avaliação: ${rating.rating} de 5 estrelas`}>{'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}</span>}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function WorkshopSearchFilters({
  filters,
  hasLocation,
  onChange,
}: {
  filters: SearchFilters;
  hasLocation: boolean;
  onChange: (filters: SearchFilters) => void;
}) {
  const toggleService = (value: string) => onChange({
    ...filters,
    serviceTypes: filters.serviceTypes.includes(value)
      ? filters.serviceTypes.filter((item) => item !== value)
      : [...filters.serviceTypes, value],
  });

  return (
    <section aria-label="Filtros de busca" className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Buscar oficina
          <input value={filters.name} onChange={(event) => onChange({ ...filters, name: event.target.value })} placeholder="Nome da oficina" className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Raio: {filters.radiusKm} km
          <input type="range" min={1} max={100} value={filters.radiusKm} disabled={!hasLocation} onChange={(event) => onChange({ ...filters, radiusKm: Number(event.target.value) })} className="h-11 accent-primary disabled:opacity-50" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Nota mínima
          <select value={filters.minRating ?? ''} onChange={(event) => onChange({ ...filters, minRating: event.target.value ? Number(event.target.value) : null })} className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Todas</option><option value="4">4+ estrelas</option><option value="3">3+ estrelas</option><option value="2">2+ estrelas</option><option value="1">1+ estrela</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Ordenar por
          <select value={hasLocation ? filters.sort : 'rating'} onChange={(event) => onChange({ ...filters, sort: event.target.value as WorkshopSort })} className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value} disabled={value === 'distance' && !hasLocation}>{label}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-foreground">Serviços oferecidos</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={filters.serviceTypes.includes(value)} onChange={() => toggleService(value)} className="h-4 w-4 accent-primary" />{label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

export default function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const mainTab = parseAppointmentTab(searchParams.get('tab')) as MainTab;
  const workshopIdParam = searchParams.get('oficina');
  const [bucket, setBucket] = useState<AppointmentBucket>('proximos');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ratings, setRatings] = useState<Map<number, WorkshopRating>>(new Map());
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopSearchItem[]>([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(false);
  const [workshopError, setWorkshopError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [step, setStep] = useState(1);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopSearchItem | null>(null);
  const [bookingWorkshop, setBookingWorkshop] = useState<WorkshopPublic | null>(null);
  const [bookingWorkshopLoading, setBookingWorkshopLoading] = useState(false);
  const [bookingWorkshopError, setBookingWorkshopError] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<WorkshopAgenda>({ days: [] });
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [transitionFocus, setTransitionFocus] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceRequestType>('manutencao');
  const [problemDescription, setProblemDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<Schedule | null>(null);
  const [workshopRatings, setWorkshopRatings] = useState<WorkshopRating[]>([]);
  const [workshopRatingsLoading, setWorkshopRatingsLoading] = useState(false);
  const [userLatMarker, setUserLatMarker] = useState<{ lat: number; lng: number } | null>(null);
  const filtersRef = useRef(filters);
  const locationRef = useRef(location);
  const workshopRequestId = useRef(0);
  const scheduleRequestId = useRef(0);
  const workshopDetailRequestId = useRef(0);
  const successTimerRef = useRef<number | null>(null);
  const previousTabRef = useRef(mainTab);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusedStepRef = useRef(step);
  filtersRef.current = filters;
  locationRef.current = location;

  useEffect(() => () => {
    if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);
  }, []);

  useEffect(() => {
    if (previousTabRef.current !== mainTab) {
      previousTabRef.current = mainTab;
      titleRef.current?.focus();
    }
  }, [mainTab]);

  useEffect(() => {
    if (focusedStepRef.current !== step) {
      focusedStepRef.current = step;
      if (transitionFocus) titleRef.current?.focus();
    }
  }, [step, transitionFocus]);

  const setMainTab = (tab: MainTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab === 'meus') {
      next.delete('oficina');
      setStep(1);
      setTransitionFocus(false);
      setBookingWorkshop(null);
      setBookingWorkshopError(null);
      setSelectedWorkshop(null);
      setSelectedDate(null);
      setSelectedSlot(null);
    }
    setSearchParams(next);
  };

  const fetchSchedules = useCallback(async () => {
    const requestId = ++scheduleRequestId.current;
    setSchedulesLoading(true);
    setScheduleError(null);
    try {
      const result = await scheduleService.listForClient(0, 50);
      if (requestId === scheduleRequestId.current) setSchedules(Array.isArray(result) ? result : []);
    } catch (error: unknown) {
      if (requestId === scheduleRequestId.current) {
        setScheduleError(error instanceof Error ? error.message : 'Não foi possível carregar seus agendamentos.');
      }
    } finally {
      if (requestId === scheduleRequestId.current) setSchedulesLoading(false);
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    try {
      const result = await workshopRatingService.listMine();
      const bySchedule = new Map<number, WorkshopRating>();
      for (const rating of Array.isArray(result) ? result : []) {
        if (rating.schedule_id !== null) bySchedule.set(rating.schedule_id, rating);
      }
      setRatings(bySchedule);
    } catch {
      setRatings(new Map());
    }
  }, []);

  useEffect(() => {
    if (mainTab !== 'meus') return;
    void fetchSchedules();
    void fetchRatings();
  }, [mainTab, refreshKey, fetchSchedules, fetchRatings]);

  useEffect(() => subscribe('schedule_status_change', () => { void fetchSchedules(); }), [subscribe, fetchSchedules]);

  useEffect(() => {
    if (!user) return;
    setContactEmail(user.email ?? '');
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage('Seu navegador não oferece localização. A busca seguirá sem distância.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setLocation(next);
        setUserLatMarker(next);
        setLocationMessage(null);
      },
      () => setLocationMessage('Localização indisponível — exibindo oficinas por avaliação.'),
      { maximumAge: 60_000, timeout: 8_000 },
    );
  }, []);

  const fetchWorkshops = useCallback(async (requestedSkip = 0) => {
    const requestId = ++workshopRequestId.current;
    setWorkshopsLoading(true);
    setWorkshopError(null);
    try {
      const currentFilters = filtersRef.current;
      const currentLocation = locationRef.current;
      const results = await workshopService.searchWorkshops({
        name: currentFilters.name.trim() || undefined,
        lat: currentLocation?.lat,
        lng: currentLocation?.lng,
        radiusKm: currentFilters.radiusKm,
        minRating: currentFilters.minRating,
        serviceTypes: currentFilters.serviceTypes,
        sort: currentLocation ? currentFilters.sort : 'rating',
        skip: requestedSkip,
        limit: PAGE_SIZE,
      });
      if (requestId !== workshopRequestId.current) return;
      setWorkshops(Array.isArray(results) ? results : []);
      setSkip(requestedSkip);
    } catch (error: unknown) {
      if (requestId !== workshopRequestId.current) return;
      setWorkshops([]);
      setWorkshopError(error instanceof Error ? error.message : 'Não foi possível buscar oficinas.');
    } finally {
      if (requestId === workshopRequestId.current) setWorkshopsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab !== 'novo' || step !== 1) return;
    const timeout = window.setTimeout(() => {
      void fetchWorkshops(0);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [mainTab, step, filters, location, fetchWorkshops]);

  useEffect(() => {
    if (!workshopIdParam || !/^\d+$/.test(workshopIdParam)) return;
    const id = Number(workshopIdParam);
    if (selectedWorkshop?.id === id && bookingWorkshop?.id === id) return;
    let cancelled = false;
    void workshopService.getWorkshopById(id).then((workshop) => {
      if (cancelled) return;
      const item: WorkshopSearchItem = {
        id: workshop.id,
        name: workshop.name,
        description: workshop.description,
        latitude: workshop.latitude,
        longitude: workshop.longitude,
        rating_avg: workshop.rating_avg,
        phone: workshop.phone,
        address: workshop.address,
        city: workshop.city,
        state: workshop.state,
      };
      setSelectedWorkshop(item);
      setBookingWorkshop(workshop);
      setStep(2);
      setMainTab('novo');
    }).catch(() => {
      if (!cancelled) setWorkshopError('Não foi possível abrir esta oficina. Busque-a novamente na lista.');
    });
    return () => { cancelled = true; };
  }, [workshopIdParam]);

  useEffect(() => {
    if (!bookingWorkshop) return;
    let cancelled = false;
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, calendarMonth.getMonth() + 1, 0).getDate();
    const from = `${year}-${month}-01`;
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    setAgendaLoading(true);
    setAgendaError(null);
    void scheduleService.getAgenda(bookingWorkshop.id, from, to)
      .then((result) => { if (!cancelled) setAgenda(result ?? { days: [] }); })
      .catch((error: unknown) => { if (!cancelled) setAgendaError(error instanceof Error ? error.message : 'Não foi possível carregar a agenda da oficina.'); })
      .finally(() => { if (!cancelled) setAgendaLoading(false); });
    return () => { cancelled = true; };
  }, [bookingWorkshop, calendarMonth]);

  useEffect(() => {
    if (!bookingWorkshop) return;
    let cancelled = false;
    setWorkshopRatingsLoading(true);
    void workshopRatingService.listForWorkshop(bookingWorkshop.id)
      .then((result) => { if (!cancelled) setWorkshopRatings(Array.isArray(result) ? result : []); })
      .catch(() => { if (!cancelled) setWorkshopRatings([]); })
      .finally(() => { if (!cancelled) setWorkshopRatingsLoading(false); });
    return () => { cancelled = true; };
  }, [bookingWorkshop?.id]);

  const agendaByDate = useMemo(() => new Map(agenda.days.map((day) => [day.date, day])), [agenda]);
  const mapCenter: [number, number] = location
    ? [location.lat, location.lng]
    : workshops.length
      ? [workshops[0].latitude, workshops[0].longitude]
      : [-15.78, -47.93];
  const hasNextPage = workshops.length === PAGE_SIZE;

  const selectWorkshop = async (workshop: WorkshopSearchItem) => {
    setSelectedWorkshop(workshop);
    setBookingWorkshop(null);
    setBookingWorkshopLoading(true);
    setBookingWorkshopError(null);
    setAgenda({ days: [] });
    setAgendaError(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(2);
    setBookingError(null);
    setBookingSuccess(false);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'novo');
    next.set('oficina', String(workshop.id));
    setSearchParams(next);
    try {
      const detail = await workshopService.getWorkshopById(workshop.id);
      if (detail.id === workshop.id) setBookingWorkshop(detail);
    } catch {
      setBookingWorkshopError('Não foi possível carregar os horários desta oficina. Tente novamente.');
    } finally {
      setBookingWorkshopLoading(false);
    }
  };

  const retryWorkshopDetails = async () => {
    if (!selectedWorkshop) return;
    setBookingWorkshopLoading(true);
    setBookingWorkshopError(null);
    try {
      setBookingWorkshop(await workshopService.getWorkshopById(selectedWorkshop.id));
    } catch (error: unknown) {
      setBookingWorkshopError(error instanceof Error ? error.message : 'Não foi possível carregar os horários desta oficina.');
    } finally {
      setBookingWorkshopLoading(false);
    }
  };

  const selectDay = (dayNumber: number) => {
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    const date = `${year}-${month}-${String(dayNumber).padStart(2, '0')}`;
    if (!agendaByDate.get(date)?.is_open) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const validateBooking = (): string | null => {
    if (!selectedDate || !selectedSlot) return 'Selecione uma data e um horário.';
    if (!problemDescription.trim()) return 'Descreva o serviço que precisa.';
    if (!contactPhone.trim()) return 'Informe um telefone para contato.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return 'Informe um e-mail válido.';
    return null;
  };

  const submitBooking = async () => {
    if (!bookingWorkshop || bookingWorkshopLoading) return;
    const validation = validateBooking();
    if (validation) { setBookingError(validation); return; }
    setBookingLoading(true);
    setBookingError(null);
    try {
      await scheduleService.create({
        workshop_id: bookingWorkshop.id,
        service_request_type: serviceType,
        problem_description: problemDescription.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        scheduled_at: buildScheduledAt(selectedDate!, selectedSlot!, getLocalTimezoneOffset()),
      });
      setBookingSuccess(true);
      setRefreshKey((key) => key + 1);
      setTimeout(() => {
        setBookingSuccess(false);
        setMainTab('meus');
      }, 1200);
    } catch (error: unknown) {
      setBookingError(error instanceof Error ? error.message : 'Não foi possível criar o agendamento.');
    } finally {
      setBookingLoading(false);
    }
  };

  const chooseMainTab = (tab: MainTab) => {
    setMainTab(tab);
  };

  const changeCalendarMonth = (month: Date) => {
    setCalendarMonth(month);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const changeFilters = (next: SearchFilters) => {
    setFilters(next);
    setSkip(0);
  };

  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const selectedDay = selectedDate ? agendaByDate.get(selectedDate) : undefined;
  const currentRating = ratingTarget ? ratings.get(ratingTarget.id) ?? null : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-6 px-4 sm:px-gutter">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agendamentos</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Encontre uma oficina, escolha o serviço e marque o melhor horário.</p>
        </div>
        <div role="tablist" aria-label="Agendamentos" className="inline-flex w-full rounded-lg border border-border bg-card p-1 sm:w-auto">
          {([['meus', 'Meus agendamentos'], ['novo', 'Novo agendamento']] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`appointments-tab-${tab}`}
              aria-selected={mainTab === tab}
              aria-controls={`appointments-panel-${tab}`}
              tabIndex={mainTab === tab ? 0 : -1}
              onClick={() => chooseMainTab(tab)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const nextTab = mainTab === 'meus' ? 'novo' : 'meus';
                chooseMainTab(nextTab);
                document.getElementById(`appointments-tab-${nextTab}`)?.focus();
              }}
              className={`min-h-11 flex-1 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none ${mainTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >{label}</button>
          ))}
        </div>
      </header>

      {mainTab === 'meus' ? (
        <section id="appointments-panel-meus" role="tabpanel" aria-labelledby="appointments-tab-meus" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Seus pedidos</h2>
              <p className="mt-1 text-sm text-muted-foreground">Acompanhe as respostas das oficinas e os horários marcados.</p>
            </div>
            <Button type="button" onClick={() => chooseMainTab('novo')}>Novo agendamento</Button>
          </div>
          <div role="tablist" aria-label="Filtrar agendamentos" className="flex gap-2 overflow-x-auto border-b border-border">
            {FILTER_TABS.map((item) => {
              const count = filterAppointments(schedules, item.value).length;
              return <button key={item.value} type="button" role="tab" aria-selected={bucket === item.value} onClick={() => setBucket(item.value)} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${bucket === item.value ? 'border-primary text-primary-text' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item.label}<span className="ml-2 text-xs tabular-nums">{count}</span></button>;
            })}
          </div>
          {scheduleError && <FormAlert variant="error">{scheduleError}</FormAlert>}
          {schedulesLoading ? (
            <div className="flex min-h-40 items-center justify-center" role="status"><span className="sr-only">Carregando agendamentos</span><span className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <ScheduleList schedules={schedules} bucket={bucket} ratings={ratings} onRate={setRatingTarget} onNew={() => chooseMainTab('novo')} />
          )}
          {schedules.length === 50 && <p className="text-xs text-muted-foreground">Mostrando os 50 agendamentos mais recentes.</p>}
        </section>
      ) : (
        <section id="appointments-panel-novo" role="tabpanel" aria-labelledby="appointments-tab-novo" className="space-y-6">
          <ol aria-label="Etapas do agendamento" className="grid grid-cols-4 gap-2 sm:gap-4">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const done = step > number;
              const active = step === number;
              return <li key={label} aria-current={active ? 'step' : undefined} className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{done ? <Check className="h-4 w-4" aria-hidden="true" /> : number}</span>
                  {index < STEPS.length - 1 && <span className={`hidden h-px flex-1 sm:block ${done ? 'bg-success' : 'bg-border'}`} aria-hidden="true" />}
                </div>
                <span className={`mt-2 block text-xs leading-tight sm:text-sm ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              </li>;
            })}
          </ol>

          {step === 1 ? (
            <>
              <div>
            <h2 ref={titleRef} tabIndex={-1} className="text-xl font-semibold text-foreground">Escolha uma oficina</h2>
                <p className="mt-1 text-sm text-muted-foreground">Compare localização, avaliação e serviços antes de escolher.</p>
              </div>
              {deepLinkError && <FormAlert variant="error">{deepLinkError}</FormAlert>}
              {locationMessage && <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{locationMessage}<button type="button" onClick={() => navigator.geolocation?.getCurrentPosition(({ coords }) => { const next = { lat: coords.latitude, lng: coords.longitude }; setLocation(next); setUserLatMarker(next); setLocationMessage(null); }, () => setLocationMessage('Não foi possível acessar sua localização. A busca continua sem distância.'))} className="ml-2 font-semibold text-primary-text underline underline-offset-2">Tentar novamente</button></div>}
              <WorkshopSearchFilters filters={filters} hasLocation={Boolean(location)} onChange={changeFilters} />
              {workshopError && <FormAlert variant="error">{workshopError}</FormAlert>}
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                <div className="min-w-0 space-y-3" aria-live="polite">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">Oficinas encontradas</h3>
                    <Button type="button" variant="outline" size="sm" disabled={workshopsLoading} onClick={() => void fetchWorkshops(0)}>Buscar</Button>
                  </div>
                  {workshopsLoading ? <div className="flex min-h-40 items-center justify-center" role="status"><span className="sr-only">Buscando oficinas</span><span className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : workshops.length === 0 ? <EmptyState title="Nenhuma oficina encontrada" description="Ajuste os filtros ou tente uma busca mais ampla." action="Limpar filtros" onAction={() => changeFilters(DEFAULT_FILTERS)} /> : (
                    <>
                      <p className="text-sm text-muted-foreground">Exibindo {skip + 1}–{skip + workshops.length}{hasNextPage ? ' · há mais resultados' : ''}</p>
                      {workshops.map((workshop) => <article key={workshop.id} className="overflow-hidden rounded-lg border border-border bg-card">
                        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0"><h4 className="truncate font-semibold text-foreground">{workshop.name}</h4>{workshop.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{workshop.description}</p>}</div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground"><Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />{workshop.rating_avg.toFixed(1)}{workshop.ratings_count !== undefined && <span className="font-normal text-muted-foreground">({workshop.ratings_count})</span>}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {(workshop.city || workshop.address) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{[workshop.address, workshop.city, workshop.state].filter(Boolean).join(', ')}</span>}
                            {workshop.distance_km != null && <span>{workshop.distance_km.toFixed(1)} km</span>}
                            {workshop.service_types?.length ? <span>{workshop.service_types.map((type) => SERVICE_TYPE_LABELS[type] ?? type).join(', ')}</span> : null}
                          </div>
                          <Button type="button" size="sm" onClick={() => void selectWorkshop(workshop)}>Agendar aqui</Button>
                        </div>
                      </article>)}
                      <div className="flex justify-center gap-2 pt-2"><Button type="button" variant="outline" size="sm" disabled={skip === 0 || workshopsLoading} onClick={() => void fetchWorkshops(Math.max(0, skip - PAGE_SIZE))}>Anterior</Button><Button type="button" variant="outline" size="sm" disabled={!hasNextPage || workshopsLoading} onClick={() => void fetchWorkshops(skip + PAGE_SIZE)}>Próxima</Button></div>
                    </>
                  )}
                </div>
                <WorkshopMap workshops={workshops} center={selectedMapCenter} zoom={location ? 12 : 4} userLocation={userLatMarker} visible={mainTab === 'novo' && step === 1} />
              </div>
            </>
          ) : !bookingWorkshop ? (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Escolha uma oficina para continuar.</div>
          ) : (
            <>
              {bookingWorkshopLoading && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground" role="status">Carregando agenda da oficina…</div>}
              {bookingWorkshopError && <FormAlert variant="error">{bookingWorkshopError}<button type="button" onClick={() => void retryWorkshopDetails()} className="ml-2 underline underline-offset-2">Tentar novamente</button></FormAlert>}
              {!bookingWorkshopLoading && !bookingWorkshop && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Escolha uma oficina para continuar.</div>}
              {!bookingWorkshopLoading && bookingWorkshop && !('work_days' in bookingWorkshop) && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Carregando detalhes da oficina.</div>}
              {bookingWorkshop && 'work_days' in bookingWorkshop && <>
                  {bookingWorkshopError && <FormAlert variant="error">{bookingWorkshopError}<button type="button" onClick={() => void retryWorkshopDetails()} className="ml-2 underline underline-offset-2">Tentar novamente</button></FormAlert>}
                  {bookingWorkshopLoading && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground" role="status">Carregando agenda da oficina…</div>}
                  {!bookingWorkshopLoading && !bookingWorkshop && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Escolha uma oficina para continuar.</div>}
                  {!bookingWorkshopLoading && bookingWorkshop && !('work_days' in bookingWorkshop) && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Carregando detalhes da oficina.</div>}
                  {bookingWorkshop && 'work_days' in bookingWorkshop && <>
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 sm:p-5">
                <div><h2 className="text-xl font-semibold text-foreground">{bookingWorkshop.name}</h2><p className="mt-1 text-sm text-muted-foreground">{[bookingWorkshop.address, bookingWorkshop.city, bookingWorkshop.state].filter(Boolean).join(', ')}</p></div>
                <Button type="button" variant="outline" size="sm" onClick={() => { setStep(1); setBookingWorkshop(null); setSelectedWorkshop(null); const next = new URLSearchParams(searchParams); next.delete('oficina'); setSearchParams(next); }}>Trocar oficina</Button>
              </div>

              {step === 2 && <div className="space-y-5">
                <div><h2 className="text-xl font-semibold text-foreground">Qual serviço você precisa?</h2><p className="mt-1 text-sm text-muted-foreground">Escolha o tipo para enviar sua solicitação à oficina.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">{REQUEST_TYPES.map((item) => <button key={item.value} type="button" aria-pressed={serviceType === item.value} onClick={() => setServiceType(item.value)} className={`flex min-h-16 items-center justify-between rounded-lg border p-4 text-left font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${serviceType === item.value ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-foreground hover:bg-accent'}`}>{item.label}{serviceType === item.value && <Check className="h-5 w-5 text-primary-text" aria-hidden="true" />}</button>)}</div>
                <div className="flex justify-end"><Button type="button" onClick={() => setStep(3)}>Continuar para data e horário</Button></div>
              </div>}

              {step === 3 && <div className="space-y-5">
                <div><h2 className="text-xl font-semibold text-foreground">Escolha data e horário</h2><p className="mt-1 text-sm text-muted-foreground">Os horários disponíveis são atualizados pela agenda da oficina.</p></div>
                {!bookingWorkshop.opening_time || !bookingWorkshop.closing_time || !bookingWorkshop.work_days ? <EmptyState title="Horários não configurados" description="Esta oficina ainda não definiu seus dias e horários de atendimento." action="Escolher outra oficina" onAction={() => { setStep(1); setBookingWorkshop(null); setSelectedWorkshop(null); }} /> : <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.9fr)]">
                  <section className="rounded-lg border border-border bg-card p-4" aria-label="Calendário de disponibilidade">
                    <div className="mb-4 flex items-center justify-between"><button type="button" aria-label="Mês anterior" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronLeft aria-hidden="true" /></button><h3 className="font-semibold text-foreground">{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3><button type="button" aria-label="Próximo mês" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronRight aria-hidden="true" /></button></div>
                    <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <span key={day} className="py-2">{day}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => {
                      const dayNumber = index + 1;
                      const date = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                      const dayInfo = agendaByDate.get(date);
                      const past = new Date(`${date}T00:00:00`) < new Date(new Date().toDateString());
                      const disabled = past || !dayInfo?.is_open;
                      return <button key={date} type="button" disabled={disabled} aria-pressed={selectedDate === date} onClick={() => selectDay(dayNumber)} className={`aspect-square min-h-10 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground/40 ${selectedDate === date ? 'bg-primary font-semibold text-primary-foreground' : disabled ? 'text-muted-foreground/40' : 'text-foreground hover:bg-accent'}`}>{dayNumber}</button>;
                    })}</div>
                    {agendaLoading && <p className="mt-3 text-sm text-muted-foreground" role="status">Atualizando horários…</p>}
                    {agendaError && <p className="mt-3 text-sm text-destructive-text" role="alert">{agendaError}</p>}
                  </section>
                  <section className="rounded-lg border border-border bg-card p-4" aria-label="Horários disponíveis">
                    <h3 className="font-semibold text-foreground">{selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione uma data'}</h3>
                    {selectedDate && selectedDay?.is_open ? <div className="mt-4 grid grid-cols-2 gap-2">{selectedDay.slots.map((slot) => <button key={slot.time} type="button" disabled={slot.busy} aria-pressed={selectedSlot === slot.time} onClick={() => setSelectedSlot(slot.time)} className={`min-h-11 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${selectedSlot === slot.time ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground hover:bg-accent'}`}>{slot.time}{slot.busy ? ' · ocupado' : ''}</button>)}</div> : <p className="mt-3 text-sm text-muted-foreground">{selectedDate ? 'A oficina está fechada nesta data.' : 'Escolha um dia para ver os horários disponíveis.'}</p>}
                    {selectedDate && selectedDay?.is_open && !selectedDay.slots.length && <p className="mt-3 text-sm text-muted-foreground">Não há horários livres neste dia.</p>}
                  </section>
                </div>}
                <div className="flex flex-wrap justify-between gap-3"><Button type="button" variant="outline" onClick={() => setStep(2)}>Voltar ao serviço</Button><Button type="button" disabled={!selectedDate || !selectedSlot} onClick={() => { setBookingError(null); setStep(4); }}>Continuar para confirmação</Button></div>
              </div>}

              {step === 4 && <div className="space-y-5">
                <div><h2 className="text-xl font-semibold text-foreground">Confirme seu pedido</h2><p className="mt-1 text-sm text-muted-foreground">Revise o serviço e deixe seus dados para a oficina responder.</p></div>
                {bookingSuccess ? <FormAlert variant="success">Pedido enviado. Atualizando seus agendamentos…</FormAlert> : <>
                  <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-3"><div><span className="block text-muted-foreground">Oficina</span><strong className="mt-1 block text-foreground">{bookingWorkshop.name}</strong></div><div><span className="block text-muted-foreground">Serviço</span><strong className="mt-1 block text-foreground">{TYPE_LABELS[serviceType]}</strong></div><div><span className="block text-muted-foreground">Data e horário</span><strong className="mt-1 block text-foreground">{selectedDate && formatDateTime(`${selectedDate}T${selectedSlot}:00`)}</strong></div></div>
                  <div className="grid gap-4 md:grid-cols-2"><Textarea label="Descreva o problema ou serviço" required rows={4} value={problemDescription} onChange={(event) => setProblemDescription(event.target.value)} placeholder="Conte o que precisa ser feito…" className="md:col-span-2" /><Input label="Telefone para contato" required type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="(11) 99999-9999" /><Input label="E-mail para contato" required type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="voce@exemplo.com" /></div>
                  {bookingError && <FormAlert variant="error">{bookingError}</FormAlert>}
                </>}
                <div className="flex flex-wrap justify-between gap-3"><Button type="button" variant="outline" disabled={bookingLoading || bookingSuccess} onClick={() => setStep(3)}>Voltar à data</Button>{!bookingSuccess && <Button type="button" loading={bookingLoading} onClick={() => void submitBooking()}>Enviar pedido</Button>}</div>
              </div>}

              {bookingWorkshop && <section className="border-t border-border pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-foreground">Avaliações da oficina</h3>{bookingWorkshop.rating_avg !== undefined && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />{bookingWorkshop.rating_avg.toFixed(1)}</span>}</div>
                {workshopRatingsLoading ? <p className="mt-3 text-sm text-muted-foreground">Carregando avaliações…</p> : workshopRatings.length ? <div className="mt-3 space-y-3">{workshopRatings.slice(0, 3).map((rating) => <article key={rating.id} className="rounded-md bg-muted/40 p-3"><div className="flex items-center justify-between text-sm"><span className="font-medium text-foreground">{rating.client_name ?? 'Cliente'}</span><span className="text-warning" aria-label={`${rating.rating} de 5 estrelas`}>{'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}</span></div>{rating.comment && <p className="mt-1 text-sm text-muted-foreground">{rating.comment}</p>}</article>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Esta oficina ainda não recebeu avaliações.</p>}
              </section>}
              </>}
            </>
          )}
          {selectedWorkshop && step > 1 && <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />O horário é enviado no seu fuso local.</p>}
        </section>
      )}

      {ratingTarget && <RatingModal open scheduleId={currentRating ? null : ratingTarget.id} scheduleLabel={`${TYPE_LABELS[ratingTarget.service_request_type] ?? ratingTarget.service_request_type} • ${formatDateTime(ratingTarget.scheduled_at)}`} existing={currentRating} onClose={() => setRatingTarget(null)} onSaved={() => { setRatingTarget(null); void fetchSchedules(); void fetchRatings(); }} />}
    </main>
  );
}
