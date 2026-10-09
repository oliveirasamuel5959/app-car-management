import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '../../components/brand/brand-logo';
import ThemeToggle from '../../components/theme-toggle';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/auth-context';
import { Container } from './container';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#audiences', label: "Who it's for" },
  { href: '#how-it-works', label: 'How it works' },
];

const linkClasses =
  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const LandingHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user?.role === 'WORKSHOP' ? '/workshop/dashboard' : '/client/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="DrivePluss home"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BrandLogo size="md" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={linkClasses}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild>
                <Link to={dashboardPath}>Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </Container>

      {isOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <Container className="space-y-1 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block rounded-md px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="grid gap-2 pt-3">
              {isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link to={dashboardPath} onClick={() => setIsOpen(false)}>
                    Go to dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/signup" onClick={() => setIsOpen(false)}>
                      Get started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
};

export default LandingHeader;
