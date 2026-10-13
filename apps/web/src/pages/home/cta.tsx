import { Link } from 'react-router-dom';
import { Car, Wrench, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container } from './container';

const PATHS: { icon: LucideIcon; title: string; description: string; label: string; to: string }[] = [
  {
    icon: Car,
    title: 'I own a vehicle',
    description: 'Track maintenance, book trusted workshops and keep every receipt.',
    label: 'Create an account',
    to: '/signup?role=client',
  },
  {
    icon: Wrench,
    title: 'I run a workshop',
    description: 'Receive service orders, publish your services and grow with reviews.',
    label: 'Register your workshop',
    to: '/signup?role=workshop',
  },
];

const FinalCta = () => (
  <section className="py-20 sm:py-24">
    <Container>
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 shadow-xl sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to get your car care in order?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-blue-50">
            Join DrivePluss today — whether you drive the car or fix it.
          </p>
        </div>

        <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
          {PATHS.map(({ icon: Icon, title, description, label, to }) => (
            <div
              key={title}
              className="flex flex-col rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-lg font-bold text-white">{title}</p>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-blue-50">{description}</p>
              <Link
                to={to}
                className="mt-5 inline-flex items-center gap-1.5 self-start rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                {label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>

        <p className="relative mt-8 text-center text-sm text-blue-50">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-white underline underline-offset-4 hover:text-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            Log in
          </Link>
        </p>
      </div>
    </Container>
  </section>
);

export default FinalCta;
