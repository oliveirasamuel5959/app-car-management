import { Star, Wrench, Car, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container } from './container';

/**
 * What the platform actually does — stated as verifiable product facts rather
 * than invented metrics. Swap in real numbers once they are measured.
 */
const PROOF: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Ratings from completed orders',
    description: 'A workshop can only be reviewed after a job is closed on the platform.',
  },
  {
    icon: Car,
    title: 'Unlimited vehicles per account',
    description: 'Every car keeps its own service history, from purchase to resale.',
  },
  {
    icon: Star,
    title: 'Full history for the workshop',
    description: 'Mechanics see prior work before quoting — no more guesswork.',
  },
  {
    icon: Wrench,
    title: 'Workshops of every size',
    description: 'From a single-bay garage to a multi-branch network.',
  },
];

const ProofBand = () => (
  <section aria-labelledby="proof-title" className="bg-muted/40 py-14">
    <Container>
      <h2 id="proof-title" className="sr-only">
        How DrivePluss keeps the marketplace honest
      </h2>
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {PROOF.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col gap-3">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <p className="font-display text-base font-bold text-foreground">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </Container>
  </section>
);

export default ProofBand;
