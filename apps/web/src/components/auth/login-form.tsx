import { useState, useEffect, useId } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';
import { getErrorMessage } from '../../lib/errors';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formErrors, setFormErrors] = useState({ email: '', password: '' });

  const emailId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (location.state?.email) {
      setFormData(prev => ({ ...prev, email: location.state.email }));
    }
  }, [location.state]);

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    if (emailError || passwordError) {
      setFormErrors({ email: emailError, password: passwordError });
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await api.auth.login(formData);
      if (response.access_token) {
        login(response);
        navigate(response.user?.role === 'WORKSHOP' ? '/workshop/dashboard' : '/client/dashboard', { replace: true });
      } else {
        setError('We could not complete your sign in. Please try again.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred during login'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = (hasError: boolean) =>
    `w-full rounded-lg border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
      hasError ? 'border-destructive-text bg-destructive/5' : 'border-input'
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <header>
        <h1 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to manage your vehicles and bookings.
        </p>
      </header>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-text"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text"
        >
          {error}
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium text-foreground">
          Email<span className="ml-0.5 text-destructive-text">*</span>
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          required
          aria-invalid={Boolean(formErrors.email)}
          aria-describedby={formErrors.email ? `${emailId}-error` : undefined}
          className={inputClasses(Boolean(formErrors.email))}
        />
        {formErrors.email && (
          <p id={`${emailId}-error`} className="text-sm text-destructive-text">
            {formErrors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
            Password<span className="ml-0.5 text-destructive-text">*</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            required
            aria-invalid={Boolean(formErrors.password)}
            aria-describedby={formErrors.password ? `${passwordId}-error` : undefined}
            className={`${inputClasses(Boolean(formErrors.password))} pr-12`}
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
        {formErrors.password && (
          <p id={`${passwordId}-error`} className="text-sm text-destructive-text">
            {formErrors.password}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
          />
        )}
        <span aria-live="polite">{isLoading ? 'Signing in…' : 'Sign in'}</span>
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Create one
        </Link>
      </p>
    </form>
  );
};

export default LoginForm;
