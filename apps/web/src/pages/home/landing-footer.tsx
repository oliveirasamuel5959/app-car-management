import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/brand/brand-logo';
import { Container } from './container';

const FOOTER_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#audiences', label: "Who it's for" },
  { href: '#how-it-works', label: 'How it works' },
];

const LandingFooter = () => (
  <footer className="border-t border-border bg-background">
    <Container className="py-12">
      <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div className="max-w-sm">
          <BrandLogo size="md" />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The all-in-one platform connecting vehicle owners with trusted workshops.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3 sm:flex-row sm:gap-8">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign up
          </Link>
        </nav>
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} DrivePluss. All rights reserved.
        </p>
      </div>
    </Container>
  </footer>
);

export default LandingFooter;
