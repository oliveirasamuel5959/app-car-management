import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/** Centered, responsive content column shared by every landing section. */
export const Container = ({ children, className }: ContainerProps) => (
  <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
    {children}
  </div>
);

interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

/** Consistent eyebrow + title + description block used above each section. */
export const SectionHeading = ({
  id,
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) => (
  <div className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
    {eyebrow && (
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
    )}
    <h2
      id={id}
      className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
    >
      {title}
    </h2>
    {description && (
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
    )}
  </div>
);
