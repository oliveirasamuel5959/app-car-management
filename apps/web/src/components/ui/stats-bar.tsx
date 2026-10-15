import { cn } from '@/lib/utils';

export interface StatItem {
  /** Label above the number. */
  label: string;
  /** The number itself. Rendered large. */
  value: number | string;
  /**
   * Makes the tile a filter control. The design's rule for this component is
   * that **each number filters Meus Agendamentos**, so a caller that wants the
   * tile to be interactive supplies both `onSelect` and `selected`.
   */
  onSelect?: () => void;
  selected?: boolean;
}

interface StatsBarProps {
  items: StatItem[];
  className?: string;
}

/**
 * StatsBar — four numbers in one card.
 *
 * A single card with internal dividers, not four separate cards: the design
 * groups them deliberately so they read as one summary. Below 768px they wrap
 * to a 2x2 grid rather than shrinking to unreadable widths.
 *
 * When `onSelect` is supplied the tile becomes a real button, so filtering is
 * keyboard-reachable; when it is not, the tile is inert text rather than a
 * clickable-looking element that does nothing.
 */
export function StatsBar({ items, className }: StatsBarProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-4 sm:divide-y-0',
        className,
      )}
    >
      {items.map((item) => {
        const interactive = Boolean(item.onSelect);
        const Tag = interactive ? 'button' : 'div';

        return (
          <Tag
            key={item.label}
            {...(interactive
              ? {
                  type: 'button' as const,
                  onClick: item.onSelect,
                  'aria-pressed': item.selected ?? false,
                }
              : {})}
            className={cn(
              'flex flex-col gap-1 px-5 py-4 text-left',
              interactive &&
                'cursor-pointer transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              item.selected && 'bg-nav-active',
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {item.label}
            </span>
            <span className="text-xl font-bold text-foreground">{item.value}</span>
          </Tag>
        );
      })}
    </div>
  );
}

export default StatsBar;
