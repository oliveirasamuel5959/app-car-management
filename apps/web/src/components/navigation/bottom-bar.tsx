import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { bottomBarFor } from '@/lib/navigation';
import { isPathActive } from './menu-item';
import { useAuth } from '@/context/auth-context';

interface BottomBarProps {
  /** Opens the full grouped menu (the design's "Mais"). */
  onOpenMenu: () => void;
}

/**
 * BottomBar — the phone navigation.
 *
 * The design replaces the sidebar with a five-destination bar below 768px
 * rather than hiding navigation behind a hamburger. Each target is at least
 * 44px tall, and the active one is marked with `aria-current`, not colour alone.
 */
export function BottomBar({ onOpenMenu }: BottomBarProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const entries = bottomBarFor(user?.role);

  const itemClasses = (active: boolean) =>
    cn(
      'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      active ? 'text-primary-text' : 'text-muted-foreground',
    );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] nav:hidden"
    >
      {entries.map((entry) => {
        const Icon = entry.icon;

        if (entry.opensMenu || !entry.path) {
          return (
            <button
              key={entry.label}
              type="button"
              onClick={onOpenMenu}
              className={itemClasses(false)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{entry.label}</span>
            </button>
          );
        }

        const activePath = entry.path.split('?')[0];
        const active = isPathActive(pathname, activePath);
        const target = entry.path.startsWith('/client/appointments')
          ? `${activePath}?tab=novo`
          : entry.path;
        return (
          <Link
            key={entry.path}
            to={target}
            aria-current={active ? 'page' : undefined}
            className={itemClasses(active)}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{entry.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomBar;
