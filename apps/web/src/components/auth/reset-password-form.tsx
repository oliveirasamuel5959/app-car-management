import { useState, useMemo, useId } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Check, X, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../lib/errors';

const fieldClasses = (hasError: boolean) =>
  `w-full rounded-lg border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError ? 'border-destructive-text bg-destructive/5' : 'border-input'
  }`;

const Req = ({ met, label }: { met: boolean; label: string }) => (
  <div className="flex items-center gap-1.5 text-sm">
    {met ? (
      <Check className="h-4 w-4 text-success-text" aria-hidden="true" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    )}
    <span className={met ? 'text-success-text' : 'text-muted-foreground'}>
      {label}
      <span className="sr-only">{met ? ' — met' : ' — not met'}</span>
    </span>
  </div>
);

/**
 * Step 2 of password recovery: set a new password using the token from the
 * emailed link (`/reset-password?token=...`). Backend endpoint pending —
 * see frontend-changes.md.
 */
const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const passwordId = useId();
  const confirmId = useId();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const rules = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
  }), [password]);
  const valid = Object.values(rules).every(Boolean);
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError('Your password does not meet the requirements below');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.auth.resetPassword({ token, password, password_confirm: confirm });
      navigate('/login', {
        replace: true,
        state: { message: 'Password updated. Please sign in with your new password.' },
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'We could not reset your password. The link may have expired — request a new one.'));
    } finally {
      setIsLoading(false);
    }
  };

  // No token in the URL — the link is malformed or was opened directly.
  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive-text">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
          This reset link is incomplete
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The link is missing its token. Request a new one and open it from your email.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <header>
        <h1 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Make it something you&apos;ll remember — at least 8 characters.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
          New password<span className="ml-0.5 text-destructive-text">*</span>
        </label>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            disabled={isLoading}
            aria-describedby="reset-password-requirements"
            className={`${fieldClasses(false)} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <div id="reset-password-requirements" className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          <Req met={rules.length} label="At least 8 characters" />
          <Req met={rules.uppercase} label="One uppercase letter" />
          <Req met={rules.digit} label="One number" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={confirmId} className="text-sm font-medium text-foreground">
          Confirm new password<span className="ml-0.5 text-destructive-text">*</span>
        </label>
        <input
          id={confirmId}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError(''); }}
          disabled={isLoading}
          aria-invalid={mismatch}
          className={fieldClasses(mismatch)}
        />
        {mismatch && (
          <p role="alert" className="text-sm text-destructive-text">
            The two passwords do not match
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
        <span aria-live="polite">{isLoading ? 'Updating…' : 'Update password'}</span>
      </button>

      <Link
        to="/login"
        className="mx-auto text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Back to sign in
      </Link>
    </form>
  );
};

export default ResetPasswordForm;
