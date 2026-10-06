import type { ReactNode } from 'react';
import LandingHeader from '../pages/home/landing-header';
import LandingFooter from '../pages/home/landing-footer';

/**
 * Public marketing shell: a lightweight header and footer wrapped around the
 * landing page. Kept separate from MainLayout so it doesn't inherit the
 * authenticated dashboard chrome.
 */
const LandingLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
    <LandingHeader />
    <main className="flex-1">{children}</main>
    <LandingFooter />
  </div>
);

export default LandingLayout;
