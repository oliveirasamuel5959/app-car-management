import { CalendarCheck, Car, History, MapPin, MessageSquare, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container, SectionHeading } from './container';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Car,
    title: 'Vehicle management',
    description: "Keep each car's details, mileage and documents organised in one place.",
  },
  {
    icon: MapPin,
    title: 'Find trusted workshops',
    description: 'Discover workshops near you and compare ratings before you book.',
  },
  {
    icon: CalendarCheck,
    title: 'Book services',
    description: 'Schedule maintenance in seconds and get confirmed in real time.',
  },
  {
    icon: History,
    title: 'Service history',
    description: 'A complete, timestamped record of every job, part and receipt.',
  },
  {
    icon: MessageSquare,
    title: 'Real-time updates',
    description: 'Chat with your workshop and follow each order status as it progresses.',
  },
  {
    icon: Star,
    title: 'Ratings & reviews',
    description: 'Leave feedback and help the community choose the best workshops.',
  },
];

const Features = () => (
  <section
    id="features"
    aria-labelledby="features-title"
    className="scroll-mt-20 bg-background py-20 sm:py-24"
  >
    <Container>
      <SectionHeading
        id="features-title"
        eyebrow="Everything in one place"
        title="A complete toolkit for car care"
        description="From the first booking to the final receipt, DrivePluss keeps drivers and workshops connected."
      />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </Container>
  </section>
);

export default Features;
