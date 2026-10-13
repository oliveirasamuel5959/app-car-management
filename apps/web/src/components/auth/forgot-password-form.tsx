import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../lib/errors';

const fieldClasses = (hasError: boolean) =>
  `w-full rounded-lg border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError ? 'border-destructive-text bg-destructive/5' : 'border-input'
  }`;

/**
 * Step 1 of password recovery: request a reset link.
 * Backend endpoint pending — see frontend-changes.md.
 */
const ForgotPasswordForm = () => {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await api.auth.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'We could not send the reset link. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success-text">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a
          link to reset your password. The link expires in 30 minutes.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <header>
        <h1 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium text-foreground">
          Email<span className="ml-0.5 text-destructive-text">*</span>
        </label>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          disabled={isLoading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${emailId}-error` : undefined}
          className={fieldClasses(Boolean(error))}
        />
        {error && (
          <p id={`${emailId}-error`} className="text-sm text-destructive-text">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading && (
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
        )}
        <span aria-live="polite">{isLoading ? 'Sending…' : 'Send reset link'}</span>
      </button>

      <Link
        to="/login"
        className="mx-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </form>
  );
};

export default ForgotPasswordForm;
