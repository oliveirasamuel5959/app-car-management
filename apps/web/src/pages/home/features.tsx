import { Link } from 'react-router-dom';
import {
  Droplet,
  Disc3,
  Gauge,
  BatteryCharging,
  Wind,
  Cog,
  Snowflake,
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  CalendarClock,
  MessagesSquare,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container } from './container';

/**
 * The service categories mirror the backend's ServiceType enum, so what the
 * landing advertises is exactly what a workshop can record on an order.
 */
const SERVICES: { icon: LucideIcon; label: string }[] = [
  { icon: Droplet, label: 'Oil change' },
  { icon: Disc3, label: 'Brake service' },
  { icon: Gauge, label: 'Tire rotation' },
  { icon: BatteryCharging, label: 'Battery' },
  { icon: Wind, label: 'Air filter' },
  { icon: Cog, label: 'Transmission' },
  { icon: Snowflake, label: 'Coolant flush' },
  { icon: AlertTriangle, label: 'Belts' },
  { icon: ClipboardCheck, label: 'Inspection' },
];

const CAPABILITIES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Verified workshops, real ratings',
    description:
      'Every workshop carries ratings earned from completed orders — not self-reported. Compare before you book.',
  },
  {
    icon: CalendarClock,
    title: 'Every service, timestamped',
    description:
      'Mileage, parts and receipts recorded against each vehicle, so the next owner — or your next mechanic — sees the whole story.',
  },
  {
    icon: MessagesSquare,
    title: 'Tracked from booking to keys-back',
    description:
      'Follow each order status, chat with the workshop, and keep the thread attached to the job.',
  },
];

const Features = () => (
  <section id="features" aria-labelledby="features-title" className="scroll-mt-20 bg-background py-20 sm:py-24">
    <Container>
      <div className="max-w-3xl">
        <h2
          id="features-title"
          className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Everything your car needs, in one record
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          From a routine oil change to a brake job, DrivePluss covers the work a car actually
          needs through its life — and keeps the history attached to the vehicle.
        </p>
      </div>

      {/* Real service categories — the unit of work on this platform. */}
      <ul className="mt-10 flex flex-wrap gap-2.5">
        {SERVICES.map(({ icon: Icon, label }) => (
          <li key={label}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {label}
            </span>
          </li>
        ))}
      </ul>

      {/* Editorial list, not a uniform card grid — each row earns its own weight. */}
      <div className="mt-16 divide-y divide-border border-t border-border">
        {CAPABILITIES.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="group grid gap-x-10 gap-y-3 py-8 sm:grid-cols-[auto_1fr] lg:grid-cols-[auto_20rem_1fr]"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="font-display text-lg font-bold text-foreground sm:col-start-2 lg:col-start-2">
              {title}
            </h3>
            <p className="text-base leading-relaxed text-muted-foreground sm:col-start-2 lg:col-start-3">
              {description}
            </p>
          </article>
        ))}
      </div>

      <Link
        to="/signup"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        See how it works for your car
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Container>
  </section>
);

export default Features;
