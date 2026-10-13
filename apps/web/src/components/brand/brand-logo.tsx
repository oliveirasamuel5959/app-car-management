import { Car } from 'lucide-react';
import { cn } from '../../lib/utils';

export type BrandTone = 'brand' | 'light' | 'dark';
export type BrandSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  /** Colour scheme for the icon tile and wordmark. */
  tone?: BrandTone;
  /** Rendered size of the mark. */
  size?: BrandSize;
  /** Hide the "DrivePluss" wordmark and render only the icon tile. */
  iconOnly?: boolean;
  className?: string;
  /** Extra classes applied to the wordmark. */
  wordmarkClassName?: string;
  /** Extra classes applied to the icon tile (e.g. hover effects). */
  iconClassName?: string;
}

const TONES: Record<BrandTone, { tile: string; text: string; accent: string }> = {
  brand: {
    tile: 'bg-primary text-primary-foreground',
    // Explicit light/dark pair: on a light panel the wordmark is near-black, on
    // a dark panel it is white. Never relies on a surface colour being assumed.
    text: 'text-foreground',
    accent: 'text-primary dark:text-cyan-300',
  },
  light: {
    tile: 'bg-white/20 text-white',
    text: 'text-white',
    accent: 'text-cyan-200',
  },
  dark: {
    tile: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    text: 'text-foreground',
    accent: 'text-primary dark:text-cyan-300',
  },
};

const SIZES: Record<BrandSize, { tile: string; icon: string; word: string }> = {
  sm: { tile: 'rounded-lg p-1.5', icon: 'h-4 w-4', word: 'text-lg' },
  md: { tile: 'rounded-lg p-1.5', icon: 'h-6 w-6', word: 'text-xl' },
  lg: { tile: 'rounded-xl p-2', icon: 'h-7 w-7', word: 'text-2xl' },
};

/**
 * DrivePluss brand mark: a car glyph in a rounded tile followed by the
 * "DrivePluss" wordmark. Shared by the landing page, auth layout and header so
 * the brand is rendered consistently everywhere.
 */
export const BrandLogo = ({
  tone = 'brand',
  size = 'md',
  iconOnly = false,
  className,
  wordmarkClassName,
  iconClassName,
}: BrandLogoProps) => {
  const palette = TONES[tone];
  const dimensions = SIZES[size];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center shadow-sm',
          palette.tile,
          dimensions.tile,
          iconClassName,
        )}
      >
        <Car className={dimensions.icon} aria-hidden="true" />
      </span>
      {!iconOnly && (
        <span
          className={cn(
            'font-display font-extrabold tracking-tight',
            palette.text,
            dimensions.word,
            wordmarkClassName,
          )}
        >
          Drive<span className={palette.accent}>Pluss</span>
        </span>
      )}
    </span>
  );
};

export default BrandLogo;
