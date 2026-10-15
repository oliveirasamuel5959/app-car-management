import { useEffect, useId, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Shared form primitives for the auth surfaces (login, signup, password reset).
 *
 * These exist because the field markup — label, required marker, error line,
 * aria wiring — was copy-pasted verbatim across four auth components, and each
 * copy had drifted on accessibility. Centralising it means the error/description
 * wiring is done once, correctly:
 *
 *  - every control gets an id, and `aria-describedby` points at the hint and/or
 *    the error actually being shown, so assistive tech reads them in order;
 *  - each control stays above the 24px minimum target size.
 *
 * Announcement policy: the error *summary* is the only assertive region. Field
 * errors deliberately carry no live role of their own — they are reached through
 * the control's `aria-describedby`. Marking every inline error `role="alert"` too
 * meant a failed signup submit opened seven assertive regions at once (summary,
 * five fields, the terms checkbox), so the same failure was announced repeatedly
 * in arbitrary order. This mirrors the GOV.UK pattern: one summary announces,
 * the fields are described.
 */

/** Field chrome: label, optional hint, optional error. Wires nothing itself. */
export const Field = ({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {label}
      {required && (
        <span className="ml-0.5 text-destructive-text" aria-hidden="true">
          *
        </span>
      )}
      {required && <span className="sr-only"> (required)</span>}
    </label>
    {children}
    {/* The id matters: it is what a control's `aria-describedby` points at. */}
    {hint && !error && (
      <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${htmlFor}-error`} className="text-sm text-destructive-text">
        {error}
      </p>
    )}
  </div>
);

/** Input styling, shared by Input/Textarea/Select so they stay visually identical. */
export const controlClasses = (hasError: boolean, extra?: string) =>
  cn(
    'w-full rounded-lg border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError ? 'border-destructive-text bg-destructive/5' : 'border-input',
    extra,
  );

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** Marks the field required for assistive tech; the visual star follows. */
  required?: boolean;
};

export const Input = ({ label, error, hint, required, className, ...props }: InputProps) => {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={controlClasses(Boolean(error), className)}
      />
    </Field>
  );
};

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export const Textarea = ({ label, error, hint, required, className, ...props }: TextareaProps) => {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <textarea
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={controlClasses(Boolean(error), className)}
      />
    </Field>
  );
};

/**
 * Checkbox with a rich label. The label wraps the control, so it is clickable
 * and needs no id — but an error still needs to reach the control, so it is
 * linked explicitly.
 */
export const Checkbox = ({
  id: providedId,
  checked,
  onChange,
  error,
  children,
  className,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
  className?: string;
}) => {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-1">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-primary"
        />
        <span className="text-sm text-muted-foreground">{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="pl-8 text-sm text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Form-level message. `error` announces assertively, `success` politely.
 *
 * Named FormAlert rather than Alert so it cannot be confused with MUI's `Alert`,
 * which ~40 files in this app import and which takes a `severity` prop instead
 * of `variant`. An auto-import picking the wrong one would swap the component
 * silently.
 */
export const FormAlert = ({
  variant,
  children,
  className,
}: {
  variant: 'error' | 'success';
  children: ReactNode;
  className?: string;
}) => (
  // role="alert"/"status" already imply the matching aria-live value; stating
  // both is redundant, so the role alone carries the announcement.
  <div
    role={variant === 'error' ? 'alert' : 'status'}
    className={cn(
      'rounded-lg border px-4 py-3 text-sm',
      variant === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive-text'
        : 'border-success/30 bg-success/10 text-success-text',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * Summary of validation failures, rendered above the form on a failed submit.
 *
 * Receives focus after a failed submit so the failures are announced once and
 * the user lands somewhere meaningful; each entry links to its field.
 */
export const ErrorSummary = ({
  errors,
  id,
  focusToken = 0,
}: {
  errors: { fieldId: string; message: string }[];
  id: string;
  /**
   * Increment on every failed submit so a repeat submit re-focuses — and so
   * re-announces — the summary. A boolean will not do: submitting twice with the
   * same errors leaves it `true`, no dependency changes, the effect never re-runs
   * and the second failure passes in silence.
   */
  focusToken?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Focus deterministically once the summary is in the DOM, rather than from a
  // rAF racing React's commit.
  useEffect(() => {
    if (focusToken > 0 && errors.length) ref.current?.focus();
  }, [focusToken, errors.length]);

  if (!errors.length) return null;
  return (
    <div
      ref={ref}
      id={id}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="font-semibold">
        {errors.length === 1
          ? 'There is 1 problem to fix'
          : `There are ${errors.length} problems to fix`}
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
        {errors.map((e) => (
          <li key={e.fieldId}>
            <a
              href={`#${e.fieldId}`}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.fieldId)?.focus();
              }}
              className="underline underline-offset-4 hover:no-underline"
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** One password rule, with its met/not-met state exposed to assistive tech. */
export const Req = ({ met, label }: { met: boolean; label: string }) => (
  <li className="flex items-center gap-1.5 text-sm">
    {met ? (
      <Check className="h-4 w-4 shrink-0 text-success-text" aria-hidden="true" />
    ) : (
      <X className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    )}
    <span className={met ? 'text-success-text' : 'text-muted-foreground'}>
      {label}
      <span className="sr-only">{met ? ' — met' : ' — not met'}</span>
    </span>
  </li>
);

/**
 * The live rule list. A `ul` rather than a grid of divs so the rules read as a
 * list, and a polite live region so ticking one off is announced.
 *
 * The live region is the wrapper, not the `ul`: `role="status"` is not an
 * allowed role on `ul` and would have stripped the list semantics the `li`
 * children depend on.
 */
export const PasswordRequirements = ({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) => (
  <div role="status" aria-live="polite" className={cn('mt-1', className)}>
    <ul id={id} className="grid list-none grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {children}
    </ul>
  </div>
);

/** Primary submit button, with a spinner and a busy state for assistive tech. */
export const SubmitButton = ({
  isLoading,
  loadingLabel,
  children,
}: {
  isLoading: boolean;
  loadingLabel: string;
  children: ReactNode;
}) => (
  <button
    type="submit"
    disabled={isLoading}
    aria-busy={isLoading}
    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading && (
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground motion-reduce:animate-none"
      />
    )}
    {/* Polite so the switch to the in-flight label is announced; aria-busy alone
        reports state without saying anything. */}
    <span aria-live="polite">{isLoading ? loadingLabel : children}</span>
  </button>
);
