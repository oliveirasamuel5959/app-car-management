import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Container } from './container';
import carImage from '../../assets/cars/car-chevrolet-tracker.png';

const HIGHLIGHTS = ['Free to get started', 'No credit card required', 'Cancel anytime'];

const Hero = () => (
  <section className="relative overflow-hidden bg-background">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-primary/10 via-secondary/5 to-transparent"
    />
    <Container className="relative py-16 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Car care, simplified
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Keep every vehicle on the road
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            DrivePluss connects vehicle owners with trusted workshops. Manage your cars, book
            maintenance, and follow every service in one professional platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/signup">
                Get started
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Log in</Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-secondary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-secondary/20 to-transparent blur-2xl"
          />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <img
              src={carImage}
              alt="A car maintained through DrivePluss"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="absolute -left-4 bottom-6 hidden rounded-xl border border-border bg-card p-4 shadow-xl sm:block">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next service
            </p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">in 12 days</p>
          </div>
          <div className="absolute -right-4 top-6 hidden items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xl sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/15 text-secondary">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Booking
              </p>
              <p className="font-display text-sm font-bold text-foreground">Confirmed</p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  </section>
);

export default Hero;
