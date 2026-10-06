import { Container, SectionHeading } from './container';

const STEPS = [
  {
    title: 'Create your account',
    description: 'Sign up as a vehicle owner or register your workshop in a few minutes.',
  },
  {
    title: 'Add vehicles or services',
    description: 'Keep your cars and offered services organised with all the essential details.',
  },
  {
    title: 'Book and stay in sync',
    description: 'Schedule maintenance, chat in real time and track every order to completion.',
  },
];

const HowItWorks = () => (
  <section
    id="how-it-works"
    aria-labelledby="how-it-works-title"
    className="scroll-mt-20 bg-background py-20 sm:py-24"
  >
    <Container>
      <SectionHeading
        id="how-it-works-title"
        eyebrow="How it works"
        title="Get started in three simple steps"
        description="No setup headaches — DrivePluss is ready from day one."
      />
      <ol className="mt-14 grid gap-8 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
                {index + 1}
              </span>
              <span aria-hidden="true" className="hidden h-px flex-1 bg-border md:block" />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </Container>
  </section>
);

export default HowItWorks;
