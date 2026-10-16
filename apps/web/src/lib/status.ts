/**
 * The single source of status labels and tints for the whole app.
 *
 * There are **two status domains** and they must not be merged. Schedules
 * (`/schedules`) and service orders (`/service-orders`) each have a state whose
 * Portuguese label is "Pendente" and another whose label is "Recusado", but the
 * underlying states are different and the strings in the API are different
 * (`pendente` vs `pending`, `recusado` vs `rejected`). Collapsing them into one
 * map would make the same key mean two things depending on the caller, so the
 * two are exported separately over one shared `StatusMeta` shape.
 *
 * Colours are expressed as a **semantic tone**, not a status name, so the tint
 * tokens in `index.css` (`--status-pending-bg`, `--status-progress-fg`, …) can be
 * shared by both domains without either owning them.
 */

/** Semantic role of a status, decoupled from any particular status name. */
export type StatusTone =
  | 'pending'
  | 'confirmed'
  | 'progress'
  | 'completed'
  | 'cancelled';

export interface StatusMeta {
  /** PT-BR label. Always rendered — colour never carries the meaning alone. */
  label: string;
  /** Which tint token pair this status draws. */
  tone: StatusTone;
  /**
   * Tailwind classes for the badge (background + foreground + border).
   * Prefer these over `color`/`bg`.
   */
  className: string;
  /**
   * @deprecated Hex pair kept only for the MUI `sx` consumers that have not been
   * migrated yet (`dashboard-page`, `services-page`, `parts-breakdown-dialog`).
   * These mirror the token values by hand. Removed in the MUI-removal group,
   * where every consumer switches to `className`.
   */
  color: string;
  /** @deprecated See `color`. */
  bg: string;
}

/** Order statuses, from `apps/backend/src/models/services.py`. */
export type ServiceOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'paid'
  | 'refunded';

/** Schedule statuses, from the `/schedules` domain. */
export type ScheduleStatus = 'pendente' | 'visualizado' | 'aceito' | 'recusado';

/**
 * Tone → badge classes. One place defines what each tone looks like, so the two
 * domains below cannot drift apart visually.
 */
const TONE_CLASS: Record<StatusTone, string> = {
  pending: 'bg-status-pending-bg text-status-pending-fg',
  confirmed: 'bg-status-confirmed-bg text-status-confirmed-fg',
  progress: 'bg-status-progress-bg text-status-progress-fg',
  completed: 'bg-status-completed-bg text-status-completed-fg',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled-fg',
};

/**
 * Builds a `StatusMeta` from its label and tone.
 *
 * `color`/`bg` are derived from a table rather than repeated per status, so the
 * deprecated hex values cannot disagree with each other.
 */
const TONE_HEX: Record<StatusTone, { color: string; bg: string }> = {
  pending: { color: '#884200', bg: '#FDF0DF' },
  confirmed: { color: '#083F69', bg: '#E1EEF7' },
  progress: { color: '#492C9E', bg: '#ECE9FE' },
  completed: { color: '#0F6537', bg: '#E3F5E9' },
  cancelled: { color: '#B91C1C', bg: '#FEE2E2' },
};

const meta = (label: string, tone: StatusTone): StatusMeta => ({
  label,
  tone,
  className: TONE_CLASS[tone],
  ...TONE_HEX[tone],
});

/**
 * Service-order statuses. Used by the Dashboard, Meus Serviços, appointment
 * detail, parts breakdown and the workshop order pages.
 */
export const STATUS_META: Record<ServiceOrderStatus, StatusMeta> = {
  pending: meta('Pendente', 'pending'),
  confirmed: meta('Confirmado', 'confirmed'),
  in_progress: meta('Em andamento', 'progress'),
  completed: meta('Concluído', 'completed'),
  cancelled: meta('Cancelado', 'cancelled'),
  rejected: meta('Recusado', 'cancelled'),
  paid: meta('Pago', 'completed'),
  refunded: meta('Reembolsado', 'pending'),
};

/**
 * Schedule statuses. A schedule is a *request*; it has its own lifecycle and its
 * own labels, and "Recusado" here is not the same event as a rejected order.
 */
export const SCHEDULE_STATUS_META: Record<ScheduleStatus, StatusMeta> = {
  pendente: meta('Pendente', 'pending'),
  visualizado: meta('Visualizado', 'confirmed'),
  aceito: meta('Aceito', 'completed'),
  recusado: meta('Recusado', 'cancelled'),
};

/** Service request types, shared by scheduling and the schedule list. */
export const TYPE_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  reparo: 'Reparo',
  inspecao: 'Inspeção',
  outro: 'Outro',
};

/**
 * Looks a status up in either domain, falling back to a neutral tone so an
 * unknown value from the API still renders a readable label instead of crashing.
 */
export function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status as ServiceOrderStatus] ??
    SCHEDULE_STATUS_META[status as ScheduleStatus] ?? {
      label: status,
      tone: 'cancelled',
      className: TONE_CLASS.cancelled,
      ...TONE_HEX.cancelled,
    }
  );
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(value)
    .replace(/ /g, ' ');
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
