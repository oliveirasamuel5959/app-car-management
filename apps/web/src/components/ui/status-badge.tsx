import { cn } from '@/lib/utils';
import type { StatusMeta } from '@/lib/status';

interface StatusBadgeProps {
  /** A `StatusMeta` from `@/lib/status` — either domain. */
  status: StatusMeta;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * StatusBadge — the status pill.
 *
 * The design's rule is explicit: **"the text always states the status; colour
 * never acts alone."** `status.label` is therefore always rendered and is
 * required by the type, so a caller cannot produce a colour-only badge. The
 * label is also what a screen reader announces; the colour is decoration.
 */
export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        status.className,
        className,
      )}
    >
      {status.label}
    </span>
  );
}

export default StatusBadge;
