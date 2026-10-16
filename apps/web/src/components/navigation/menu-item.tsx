import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Count shown beside the label (e.g. unread messages). */
  badge?: number;
}

export interface NavGroup {
  /** Group heading. Omitted groups render unlabelled at the top of the menu. */
  title?: string;
  items: NavItem[];
}

/** A path is active when the current location is it, or is nested under it. */
export function isPathActive(currentPath: string, itemPath: string): boolean {
  const normalizedItemPath = itemPath.split('?')[0];
  if (currentPath === normalizedItemPath) return true;
  return currentPath.startsWith(`${normalizedItemPath}/`);
}

interface MenuItemProps {
  item: NavItem;
  currentPath: string;
  /** Render for the bottom bar: icon above a small label. */
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/**
 * MenuItem — one navigation entry.
 *
 * Active state is derived from the route **prefix**, so a detail route such as
 * `/client/appointments/42` keeps "Agendamentos" highlighted. The previous
 * sidebars compared the pathname exactly, so no sub-route highlighted anything.
 *
 * Below 768px the same component renders as a bottom-bar item (icon above a
 * short label); the design turns the menu into a bottom bar at that width
 * rather than into a drawer.
 */
export function MenuItem({
  item,
  currentPath,
  compact = false,
  onNavigate,
  className,
}: MenuItemProps) {
  const active = isPathActive(currentPath, item.path);
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact
          ? 'flex-col justify-center gap-1 px-1 py-2 text-[11px]'
          : 'gap-3 px-3 py-2.5 text-sm',
        active
          ? 'bg-nav-active text-nav-active-foreground'
          : 'text-muted-foreground hover:bg-nav-hover hover:text-foreground',
        className,
      )}
    >
      <Icon className={compact ? 'h-5 w-5' : 'h-5 w-5 shrink-0'} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <span
          className={cn(
            'ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground',
            compact && 'ml-0 mt-0.5',
          )}
        >
          {item.badge > 99 ? '99+' : item.badge}
          <span className="sr-only"> itens</span>
        </span>
      ) : null}
    </Link>
  );
}

interface MenuGroupProps {
  group: NavGroup;
  currentPath: string;
  onNavigate?: () => void;
}

/**
 * MenuGroup — a titled section of the menu. The heading is a real heading
 * element so the menu can be navigated by landmark, and it is hidden from the
 * accessible name of each item (which is just the label).
 */
export function MenuGroup({ group, currentPath, onNavigate }: MenuGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      {group.title && (
        <h2 className="px-3 pb-1 pt-4 text-xs font-semibold text-muted-foreground">
          {group.title}
        </h2>
      )}
      {group.items.map((item) => (
        <MenuItem
          key={item.path}
          item={item}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export default MenuItem;
