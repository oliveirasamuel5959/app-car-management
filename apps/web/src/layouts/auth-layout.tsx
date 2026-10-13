import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/brand/brand-logo';
import ThemeToggle from '../components/theme-toggle';
import loginImage640 from '../assets/login-image-640.webp';
import loginImage1240 from '../assets/login-image-1240.webp';

/**
 * Public auth shell for /login, /signup and the password-reset screens.
 * Token-driven (like the landing page) so light/dark both hold, with the same
 * brand mark, home link and theme toggle the visitor just used on `/`.
 */
const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground lg:flex-row">
      {/* Compact brand band — mobile & tablet */}
      <header className="relative overflow-hidden bg-primary px-5 py-6 text-primary-foreground lg:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-secondary/30 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="DrivePluss home"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <BrandLogo tone="light" size="md" />
          </Link>
          <ThemeToggle className="text-primary-foreground hover:bg-white/15" />
        </div>
        <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
          Take your maintenance to the next level — for vehicle owners and workshops.
        </p>
      </header>

      {/* Branding panel — desktop */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:w-[46%] lg:max-w-[620px] lg:flex-col lg:px-10 lg:pt-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-secondary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="DrivePluss home"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <BrandLogo tone="light" size="lg" />
          </Link>
          <ThemeToggle className="text-primary-foreground hover:bg-white/15" />
        </div>

        <p className="relative mt-10 max-w-[22rem] font-display text-3xl font-bold leading-tight tracking-tight text-primary-foreground">
          Take your maintenance to the next level
        </p>
        <p className="relative mt-4 max-w-[24rem] text-base leading-relaxed text-primary-foreground/80">
          Manage your vehicles, book trusted workshops, and follow every service in one place.
        </p>

        <div className="relative mt-auto pt-10">
          <img
            src={loginImage1240}
            srcSet={`${loginImage640} 640w, ${loginImage1240} 1240w`}
            sizes="(min-width: 1024px) 46vw, 100vw"
            alt="A car being serviced at a workshop"
            width={1240}
            height={826}
            loading="eager"
            decoding="async"
            className="h-[46vh] max-h-[520px] w-full rounded-t-2xl object-cover object-center shadow-2xl"
          />
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col bg-background">
        <div className="hidden items-center justify-end gap-2 px-6 py-5 lg:flex">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-start justify-center px-5 py-10 sm:px-8 lg:items-center lg:py-12">
          <div className="w-full max-w-[30rem]">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
