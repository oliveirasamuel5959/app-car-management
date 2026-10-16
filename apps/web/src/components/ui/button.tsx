import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

/**
 * Button — the design system's primary and secondary actions.
 *
 * The design allows **one primary action per screen**; everything else is
 * `outline` or `ghost`. `loading` keeps the label in place and blocks the click,
 * so the button does not resize mid-action.
 */
const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				/* The design's "Secundário": an outlined button, not a filled one. */
				outline:
          'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
				destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary-text underline-offset-4 hover:underline',
			},
			size: {
				/* 44px tall: the design's minimum touch target. */
				default: 'h-11 px-5 py-2',
				sm: 'h-9 rounded-sm px-3',
				lg: 'h-12 rounded-md px-8 text-base',
				icon: 'h-11 w-11',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	/** Shows a spinner, keeps the label, and disables the button. */
	loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			loading = false,
			disabled,
			children,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				disabled={disabled || loading}
				aria-busy={loading || undefined}
				{...props}
			>
				{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
				{children}
			</Comp>
		);
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };
