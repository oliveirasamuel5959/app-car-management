import { useLocation } from 'react-router-dom';

import { MenuGroup } from './menu-item';
import { navGroupsFor } from '@/lib/navigation';
import { useAuth } from '@/context/auth-context';

interface AppSidebarProps {
  onNavigate?: () => void;
}

/**
 * AppSidebar — the grouped menu.
 *
 * Width comes from the design: the sidebar starts at the top of the page (it is
 * not offset below the header). Its 6 destinations replace the previous 9 (client)
 * and 10 (workshop) flat items.
 */
export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <nav
      aria-label="Navegação principal"
      className="flex h-full flex-col overflow-y-auto border-r border-border bg-sidebar px-2 py-3"
    >
      {navGroupsFor(user?.role).map((group, index) => (
        <MenuGroup
          key={group.title ?? `group-${index}`}
          group={group}
          currentPath={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export default AppSidebar;
