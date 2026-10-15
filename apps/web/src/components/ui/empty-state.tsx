import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** What is missing, in one sentence. */
  title: string;
  /** Why it is empty and what will fill it. */
  description?: string;
  /**
   * The next step. **Required** — the design's rule is that "every empty list
   * explains and offers a next step", and an empty state with no way forward is
   * the exact defect this redesign set out to remove.
   *
   * The requirement is enforced by the type: a caller cannot render an
   * `EmptyState` without either `action` or `actionHref`.
   */
  action: string;
  /** Handler for the next step. One of `onAction` / `actionHref` is required. */
  onAction?: () => void;
  /** Link target for the next step. One of `onAction` / `actionHref` is required. */
  actionHref?: string;
  icon?: LucideIcon;
  className?: string;
}

type EmptyStateAction =
  | { onAction: () => void; actionHref?: never }
  | { actionHref: string; onAction?: never };

/**
 * EmptyState — what a list shows when it has nothing.
 *
 * Dashed rather than solid border, so an empty region reads as a placeholder
 * rather than as a card that failed to load.
 */
export function EmptyState({
  title,
  description,
  action,
  onAction,
  actionHref,
  icon: Icon,
  className,
}: EmptyStateProps & EmptyStateAction) {
  const actionClasses =
    'mt-1 text-sm font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionHref ? (
        <a href={actionHref} className={actionClasses}>
          {action}
        </a>
      ) : (
        <button type="button" onClick={onAction} className={actionClasses}>
          {action}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
