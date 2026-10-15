import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';
import { getErrorMessage } from '../../lib/errors';
import { ErrorSummary, FormAlert, Input, SubmitButton, controlClasses } from '../ui/field';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Two ways a message reaches this page: handed over by signup, or by the API
  // layer when it bounces an expired session back here.
  const reason = new URLSearchParams(location.search).get('reason');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message ||
      (reason === 'session-expired' ? 'Your session expired. Please log in again.' : ''),
  );

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formErrors, setFormErrors] = useState({ email: '', password: '' });
  // Bumped on every failed submit so the summary re-focuses — and re-announces —
  // even when the errors are unchanged from the previous attempt.
  const [focusToken, setFocusToken] = useState(0);

  useEffect(() => {
    if (location.state?.email) {
      setFormData((prev) => ({ ...prev, email: location.state.email }));
    }
  }, [location.state]);

  useEffect(() => {
    if (reason === 'session-expired') {
      setSuccessMessage('Your session expired. Please log in again.');
    }
  }, [reason]);

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    return '';
  };

  // No length rule here on purpose: an existing account's password may predate
  // the current policy, and rejecting it here would block a valid login before
  // the server ever sees it.
  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setFormErrors({ email: emailError, password: passwordError });
      setFocusToken((n) => n + 1);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await api.auth.login(formData);
      if (response.access_token) {
        login(response);
        navigate(response.user?.role === 'WORKSHOP' ? '/workshop/dashboard' : '/client/dashboard', {
          replace: true,
        });
      } else {
        setError('We could not complete your sign in. Please try again.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred during login'));
      setFocusToken((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const summaryErrors = [
    formErrors.email && { fieldId: 'login-email', message: formErrors.email },
    formErrors.password && { fieldId: 'login-password', message: formErrors.password },
  ].filter(Boolean) as { fieldId: string; message: string }[];

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
        <header>
          <h1 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to manage your vehicles and bookings.
          </p>
        </header>

        {successMessage && <FormAlert variant="success">{successMessage}</FormAlert>}
        {error && <FormAlert variant="error">{error}</FormAlert>}
        <ErrorSummary id="login-error-summary" errors={summaryErrors} focusToken={focusToken} />

        <Input
          id="login-email"
          label="Email"
          required
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          error={formErrors.email}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
              <span className="ml-0.5 text-destructive-text" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </label>
            <Link
              to="/forgot-password"
              className="inline-flex min-h-6 items-center text-sm font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={formErrors.password ? true : undefined}
              aria-describedby={formErrors.password ? 'login-password-error' : undefined}
              className={controlClasses(Boolean(formErrors.password), 'pr-12')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {formErrors.password && (
            <p id="login-password-error" className="text-sm text-destructive-text">
              {formErrors.password}
            </p>
          )}
        </div>

        <SubmitButton isLoading={isLoading} loadingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      {/* Outside the form: it is navigation, not a form control, so it should
          not be part of the form's submit semantics. */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="inline-flex min-h-6 items-center font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Create one
        </Link>
      </p>
    </>
  );
};

export default LoginForm;
