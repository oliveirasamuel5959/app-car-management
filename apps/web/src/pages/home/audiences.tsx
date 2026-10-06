import { Link } from 'react-router-dom';
import { Car, Check, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Container, SectionHeading } from './container';

interface Audience {
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  cta: { label: string; to: string };
}

const AUDIENCES: Audience[] = [
  {
    icon: Car,
    title: 'For vehicle owners',
    description: 'Stay on top of maintenance and never miss a service again.',
    points: [
      'Add and manage multiple vehicles',
      'Discover rated workshops nearby',
      'Book and pay securely online',
      'Keep a complete service history',
    ],
    cta: { label: 'Create an account', to: '/signup' },
  },
  {
    icon: Wrench,
    title: 'For workshops',
    description: 'Win more clients and run your shop from a single dashboard.',
    points: [
      'Manage incoming service orders',
      'Publish services and pricing',
      'Message clients in real time',
      'Grow with verified reviews',
    ],
    cta: { label: 'Register your workshop', to: '/signup' },
  },
];

const Audiences = () => (
  <section
    id="audiences"
    aria-labelledby="audiences-title"
    className="scroll-mt-20 bg-muted/40 py-20 sm:py-24"
  >
    <Container>
      <SectionHeading
        id="audiences-title"
        eyebrow="Built for both sides"
        title="One platform, two experiences"
        description="Whether you own a car or run a workshop, DrivePluss adapts to how you work."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {AUDIENCES.map(({ icon: Icon, title, description, points, cta }) => (
          <article
            key={title}
            className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-xl font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            <ul className="mt-6 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 self-start">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          </article>
        ))}
      </div>
    </Container>
  </section>
);

export default Audiences;
