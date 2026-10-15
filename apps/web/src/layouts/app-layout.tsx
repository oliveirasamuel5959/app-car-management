import { useState } from 'react';

import Header from '../components/navigation/header';
import AppSidebar from '../components/navigation/app-sidebar';
import BottomBar from '../components/navigation/bottom-bar';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout — the one authenticated shell.
 *
 * Structure per the design: a fixed brand bar across the full width, a sidebar
 * that starts below it, and a centred content band of a fixed maximum width with
 * one gutter — the same on every screen, which is what the redesign set out to
 * fix ("different widths and margins per screen").
 *
 * Below 768px the sidebar is replaced by the bottom bar; the full grouped menu
 * stays reachable from the bar's "Mais" entry, which opens the same sidebar in a
 * dialog so no destination becomes unreachable on a phone.
 */
export const AppLayout = ({ children }: AppLayoutProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Offset for the fixed header (h-16 = 64px). */}
      <div className="flex flex-1 pt-16">
        <aside className="hidden w-sidebar shrink-0 pt-4 nav:block">
          <AppSidebar />
        </aside>

        <main className="min-w-0 flex-1 pb-24 nav:pb-8">
          <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-gutter nav:py-8">
            {children}
          </div>
        </main>
      </div>

      <BottomBar onOpenMenu={() => setMenuOpen(true)} />

      {/* The "Mais" sheet: the same sidebar, so nothing is phone-only-reachable. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 nav:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-64 max-w-[80%] bg-card shadow-xl"
          >
            <AppSidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
