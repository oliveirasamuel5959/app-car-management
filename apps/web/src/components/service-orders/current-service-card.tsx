import { cn } from '@/lib/utils';
import type { StatusMeta } from '@/lib/status';
import { StatusBadge } from '@/components/ui/status-badge';

/**
 * The four steps a service order moves through, in order. Mirrors the backend
 * transition graph (`apps/backend/src/services/services.py`): each entry names
 * the status that *reaches* it.
 */
const STEPS = [
  { key: 'pending', label: 'Pendente' },
  { key: 'confirmed', label: 'Confirmado' },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'completed', label: 'Concluído' },
] as const;

interface CurrentServiceCardProps {
  /** Service name, e.g. "Troca de óleo". */
  title: string;
  /** Workshop name. */
  workshop?: string;
  /** Current order status, as returned by the API. */
  status: string;
  /** Status metadata from `@/lib/status`. */
  statusMeta: StatusMeta;
  /** Order statuses that mean the order is no longer progressing. */
  cancelled?: boolean;
  /** Right-hand action, usually "Ver detalhes". */
  action?: React.ReactNode;
  /** Rendered under the track, e.g. the delivery estimate. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * CurrentServiceCard — the service in progress, with its steps.
 *
 * The progress track answers "where is my car" without a click, which is why
 * this card replaces the standalone Meus Serviços page: the design moves that
 * page's status into the Dashboard and the appointment detail.
 *
 * The track shows completed steps, the current step, and the remaining ones as
 * three distinct states, and every step carries its label — the bar is never the
 * only signal. A cancelled or rejected order does not render the track at all,
 * because "step 2 of 4" would be a lie about an order that stopped.
 */
export function CurrentServiceCard({
  title,
  workshop,
  status,
  statusMeta,
  cancelled = false,
  action,
  footer,
  className,
}: CurrentServiceCardProps) {
  const currentIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <section
      className={cn('rounded-md border border-border bg-card p-6', className)}
      aria-labelledby="current-service-title"
    >
      <h2
        id="current-service-title"
        className="text-xs font-semibold text-muted-foreground"
      >
        Seu serviço atual
      </h2>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-foreground">{title}</p>
          {workshop && (
            <p className="truncate text-sm text-muted-foreground">{workshop}</p>
          )}
        </div>
        <StatusBadge status={statusMeta} />
      </div>

      {!cancelled && currentIndex >= 0 && (
        <>
          <ol className="mt-5 flex flex-col gap-3">
            {STEPS.map((step, index) => {
              const done = index < currentIndex;
              const current = index === currentIndex;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                      done && 'border-status-completed-fg bg-status-completed-bg text-status-completed-fg',
                      current && 'border-primary bg-primary text-primary-foreground',
                      !done && !current && 'border-border text-muted-foreground',
                    )}
                  >
                    {done ? '✓' : current ? '●' : ''}
                  </span>
                  <span
                    className={cn(
                      'text-sm',
                      done && 'text-muted-foreground',
                      current && 'font-semibold text-foreground',
                      !done && !current && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                    <span className="sr-only">
                      {done
                        ? ' — concluída'
                        : current
                          ? ' — etapa atual'
                          : ' — pendente'}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          {/* The bar gives an at-a-glance read of the same four steps. */}
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-track"
            role="img"
            aria-label={`Etapa ${currentIndex + 1} de ${STEPS.length}: ${STEPS[currentIndex].label}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </>
      )}

      {footer && <div className="mt-4 text-sm text-muted-foreground">{footer}</div>}
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

export default CurrentServiceCard;
