import { useState, useMemo, useRef, useId } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../lib/errors';

type AccountRole = 'CLIENT' | 'WORKSHOP';
type AddressResult = {
  display_name: string;
  lat: string;
  lon: string;
};

// ── Reusable field wrapper ────────────────────────────────────────────────────
type FieldShellProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

const FieldShell = ({ label, htmlFor, required, error, hint, children, className }: FieldShellProps) => (
  <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-destructive-text">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && (
      <p id={`${htmlFor}-error`} className="text-sm text-destructive-text">
        {error}
      </p>
    )}
  </div>
);

const fieldClasses = (hasError: boolean) =>
  `w-full rounded-lg border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError ? 'border-destructive-text bg-destructive/5' : 'border-input'
  }`;

// ── Reusable Input ────────────────────────────────────────────────────────────
const Input = ({
  label,
  error,
  required,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
}) => {
  const id = useId();
  const inputId = props.id ?? id;
  return (
    <FieldShell label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={fieldClasses(Boolean(error))}
      />
    </FieldShell>
  );
};

// ── Password requirement row ──────────────────────────────────────────────────
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

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+55', flag: '🇧🇷', label: 'BR' },
  { code: '+1', flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'GB' },
  { code: '+49', flag: '🇩🇪', label: 'DE' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+39', flag: '🇮🇹', label: 'IT' },
  { code: '+351', flag: '🇵🇹', label: 'PT' },
];

// ── Main component ────────────────────────────────────────────────────────────
const SignupForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole: AccountRole = roleParam === 'workshop' ? 'WORKSHOP' : 'CLIENT';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    role: initialRole,
    countryCode: '+55',
    phone: '',
    password: '',
    acceptTerms: false,
    acceptMarketing: false,
    workshopName: '',
    workshopEmail: '',
    workshopDescription: '',
    workshopLatitude: '',
    workshopLongitude: '',
  });
  const [workshopAddressQuery, setWorkshopAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [manualCoords, setManualCoords] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validate ────────────────────────────────────────────────────────────────
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // ── Password rules — mirror the backend contract exactly
  //    (UserRegister: >=8 chars, one uppercase, one digit).
  const pwRules = useMemo(() => ({
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    digit: /[0-9]/.test(form.password),
  }), [form.password]);

  const pwValid = Object.values(pwRules).every(Boolean);
  const isWorkshop = form.role === 'WORKSHOP';

  const hasCoords =
    Boolean(form.workshopLatitude.trim()) &&
    !Number.isNaN(Number(form.workshopLatitude)) &&
    Boolean(form.workshopLongitude.trim()) &&
    !Number.isNaN(Number(form.workshopLongitude));

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.lastName.trim())  e.lastName = 'Last name is required';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.email.trim())     e.email = 'Email is required';
    else if (!validateEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (!pwValid) e.password = 'Password does not meet the requirements below';
    if (!form.acceptTerms) e.acceptTerms = 'Please accept the Terms and Privacy Policy to continue';
    if (isWorkshop) {
      if (!form.workshopName.trim()) e.workshopName = 'Workshop name is required';
      if (!form.workshopEmail.trim()) e.workshopEmail = 'Workshop email is required';
      else if (!validateEmail(form.workshopEmail)) e.workshopEmail = 'Enter a valid workshop email address';
      if (!form.workshopDescription.trim()) e.workshopDescription = 'Workshop description is required';
      if (!workshopAddressQuery.trim()) e.workshopAddressQuery = 'Workshop address is required';
      // Coordinates are the real requirement; they arrive either from the
      // address lookup or from manual entry.
      if (!hasCoords) e.workshopLocation = 'Look up the address, or enter the latitude and longitude manually';
    }
    return e;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const blur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleRoleChange = (value: string) => {
    const nextRole = value as AccountRole;
    setForm(prev => ({
      ...prev,
      role: nextRole,
      workshopEmail: nextRole === 'WORKSHOP' && !prev.workshopEmail ? prev.email : prev.workshopEmail,
    }));
    if (nextRole !== 'WORKSHOP') {
      setErrors(prev => {
        const nextErrors = { ...prev };
        delete nextErrors.workshopName;
        delete nextErrors.workshopEmail;
        delete nextErrors.workshopDescription;
        delete nextErrors.workshopAddressQuery;
        delete nextErrors.workshopLocation;
        return nextErrors;
      });
    }
  };

  const handleWorkshopAddressChange = (value: string) => {
    setWorkshopAddressQuery(value);
    setSelectedAddress('');
    setAddressResults([]);
    setForm(prev => ({ ...prev, workshopLatitude: '', workshopLongitude: '' }));
  };

  const searchAddress = async () => {
    if (!workshopAddressQuery.trim()) {
      setTouched(prev => ({ ...prev, workshopAddressQuery: true }));
      setErrors(prev => ({ ...prev, workshopAddressQuery: 'Workshop address is required' }));
      return;
    }

    setIsSearchingAddress(true);
    setServerError('');

    try {
      const results = await api.location.searchAddress(workshopAddressQuery.trim());
      setAddressResults(results);

      if (!results.length) {
        setErrors(prev => ({ ...prev, workshopAddressQuery: 'No address matches found. Try a more specific search, or enter coordinates manually.' }));
        setManualCoords(true);
      } else {
        setErrors(prev => {
          const nextErrors = { ...prev };
          delete nextErrors.workshopAddressQuery;
          delete nextErrors.workshopLocation;
          return nextErrors;
        });
      }
    } catch (err: unknown) {
      setAddressResults([]);
      setManualCoords(true);
      setServerError(getErrorMessage(err, 'Address lookup failed. Enter the coordinates manually below.'));
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddress = (result: AddressResult) => {
    setSelectedAddress(result.display_name);
    setWorkshopAddressQuery(result.display_name);
    setAddressResults([]);
    setForm(prev => ({ ...prev, workshopLatitude: result.lat, workshopLongitude: result.lon }));
    setTouched(prev => ({ ...prev, workshopAddressQuery: true }));
    setErrors(prev => {
      const nextErrors = { ...prev };
      delete nextErrors.workshopAddressQuery;
      delete nextErrors.workshopLocation;
      return nextErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({
      lastName: true,
      firstName: true,
      email: true,
      password: true,
      acceptTerms: true,
      workshopName: true,
      workshopEmail: true,
      workshopDescription: true,
      workshopAddressQuery: true,
    });

    if (Object.keys(errs).length) {
      requestAnimationFrame(() => {
        const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      });
      return;
    }

    setIsLoading(true);
    setServerError('');
    try {
      await api.auth.register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        age: 25,
        sex: 'M',
        email: form.email.trim(),
        password: form.password,
        password_confirm: form.password,
        role: form.role,
        tenant_name: isWorkshop ? form.workshopName.trim() : undefined,
      });

      if (isWorkshop) {
        await api.workshops.create({
          name: form.workshopName.trim(),
          email: form.workshopEmail.trim(),
          description: form.workshopDescription.trim(),
          latitude: Number(form.workshopLatitude),
          longitude: Number(form.workshopLongitude),
          rating_avg: 0,
        });
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/login', {
        replace: true,
        state: {
          message: isWorkshop
            ? 'Registration successful. Your workshop profile was created. Please log in.'
            : 'Registration successful! Please log in.',
          email: form.email,
        },
      });
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <header>
        <h1 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Free to get started — no credit card required.
        </p>
      </header>

      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text"
        >
          {serverError}
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          required
          autoComplete="given-name"
          placeholder="Jean"
          value={form.firstName}
          onChange={e => set('firstName', e.target.value)}
          onBlur={() => blur('firstName')}
          error={touched.firstName ? errors.firstName : ''}
        />
        <Input
          label="Last name"
          required
          autoComplete="family-name"
          placeholder="Dupont"
          value={form.lastName}
          onChange={e => set('lastName', e.target.value)}
          onBlur={() => blur('lastName')}
          error={touched.lastName ? errors.lastName : ''}
        />
      </div>

      {/* Email */}
      <Input
        label="Email"
        required
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={e => set('email', e.target.value)}
        onBlur={() => blur('email')}
        error={touched.email ? errors.email : ''}
      />

      {/* Role */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="account-type" className="text-sm font-medium text-foreground">
          Account type<span className="ml-0.5 text-destructive-text">*</span>
        </label>
        <select
          id="account-type"
          value={form.role}
          onChange={e => handleRoleChange(e.target.value)}
          className={fieldClasses(false)}
        >
          <option value="CLIENT">Vehicle owner</option>
          <option value="WORKSHOP">Workshop</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {isWorkshop
            ? 'Register your workshop to receive and manage service orders.'
            : 'Manage your vehicles, book workshops and track every service.'}
        </p>
      </div>

      {isWorkshop && (
        <section
          aria-labelledby="workshop-details-heading"
          className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 px-4 py-5"
        >
          <div>
            <h2 id="workshop-details-heading" className="font-display text-lg font-bold text-foreground">
              Workshop details
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These details are saved to your public workshop profile.
            </p>
          </div>

          <Input
            label="Workshop name"
            required
            autoComplete="organization"
            placeholder="Downtown Auto Care"
            value={form.workshopName}
            onChange={e => set('workshopName', e.target.value)}
            onBlur={() => blur('workshopName')}
            error={touched.workshopName ? errors.workshopName : ''}
          />

          <Input
            label="Workshop email"
            required
            type="email"
            autoComplete="email"
            placeholder="contact@yourworkshop.com"
            value={form.workshopEmail}
            onChange={e => set('workshopEmail', e.target.value)}
            onBlur={() => blur('workshopEmail')}
            error={touched.workshopEmail ? errors.workshopEmail : ''}
          />

          <FieldShell
            label="Workshop description"
            htmlFor="workshop-description"
            required
            error={touched.workshopDescription ? errors.workshopDescription : ''}
          >
            <textarea
              id="workshop-description"
              placeholder="Specialities, years in business, brands you service"
              value={form.workshopDescription}
              onChange={e => set('workshopDescription', e.target.value)}
              onBlur={() => blur('workshopDescription')}
              rows={4}
              aria-invalid={Boolean(touched.workshopDescription && errors.workshopDescription)}
              aria-describedby={touched.workshopDescription && errors.workshopDescription ? 'workshop-description-error' : undefined}
              className={fieldClasses(Boolean(touched.workshopDescription && errors.workshopDescription))}
            />
          </FieldShell>

          <FieldShell
            label="Workshop address"
            htmlFor="workshop-address"
            required
            error={touched.workshopAddressQuery ? errors.workshopAddressQuery : ''}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="workshop-address"
                autoComplete="street-address"
                placeholder="Street, neighbourhood, city"
                value={workshopAddressQuery}
                onChange={e => handleWorkshopAddressChange(e.target.value)}
                onBlur={() => blur('workshopAddressQuery')}
                aria-invalid={Boolean(touched.workshopAddressQuery && errors.workshopAddressQuery)}
                aria-describedby={touched.workshopAddressQuery && errors.workshopAddressQuery ? 'workshop-address-error' : undefined}
                className={fieldClasses(Boolean(touched.workshopAddressQuery && errors.workshopAddressQuery))}
              />
              <button
                type="button"
                onClick={searchAddress}
                disabled={isSearchingAddress}
                className="shrink-0 rounded-lg border border-input bg-card px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSearchingAddress ? 'Searching…' : 'Find address'}
              </button>
            </div>

            {addressResults.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                {addressResults.map(result => (
                  <li key={`${result.lat}-${result.lon}-${result.display_name}`}>
                    <button
                      type="button"
                      onClick={() => selectAddress(result)}
                      className="block w-full border-b border-border px-4 py-3 text-left text-sm text-foreground transition last:border-b-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      {result.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedAddress && (
              <div className="mt-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-text">
                <p className="font-medium">Selected address</p>
                <p className="mt-1">{selectedAddress}</p>
              </div>
            )}

            {!selectedAddress && hasCoords && (
              <div className="mt-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-text">
                <p className="font-medium">Coordinates set</p>
                <p className="mt-1">
                  {Number(form.workshopLatitude).toFixed(5)}, {Number(form.workshopLongitude).toFixed(5)}
                </p>
              </div>
            )}

            {/* Manual coordinate fallback — keeps signup possible when the
                address lookup is unavailable or returns nothing. */}
            <button
              type="button"
              onClick={() => setManualCoords(v => !v)}
              aria-expanded={manualCoords}
              className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${manualCoords ? 'rotate-180' : ''}`} aria-hidden="true" />
              {manualCoords ? 'Hide manual coordinates' : 'Enter coordinates manually'}
            </button>

            {manualCoords && (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Latitude"
                  inputMode="decimal"
                  placeholder="-23.55052"
                  value={form.workshopLatitude}
                  onChange={e => set('workshopLatitude', e.target.value)}
                  onBlur={() => blur('workshopAddressQuery')}
                />
                <Input
                  label="Longitude"
                  inputMode="decimal"
                  placeholder="-46.63331"
                  value={form.workshopLongitude}
                  onChange={e => set('workshopLongitude', e.target.value)}
                />
              </div>
            )}

            {errors.workshopLocation && (
              <p id="workshop-location-error" className="text-sm text-destructive-text">
                {errors.workshopLocation}
              </p>
            )}
          </FieldShell>
        </section>
      )}

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Country code"
            value={form.countryCode}
            onChange={e => set('countryCode', e.target.value)}
            className={`${fieldClasses(false)} w-24 shrink-0 px-3`}
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="11 2596-1145"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className={`${fieldClasses(false)} flex-1`}
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password<span className="ml-0.5 text-destructive-text">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            onBlur={() => blur('password')}
            aria-invalid={Boolean(touched.password && errors.password)}
            aria-describedby="password-requirements"
            className={`${fieldClasses(Boolean(touched.password && errors.password))} pr-12`}
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

        <div id="password-requirements" className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          <Req met={pwRules.length} label="At least 8 characters" />
          <Req met={pwRules.uppercase} label="One uppercase letter" />
          <Req met={pwRules.digit} label="One number" />
        </div>

        {touched.password && errors.password && (
          <p className="text-sm text-destructive-text">{errors.password}</p>
        )}
      </div>

      {/* Checkboxes */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={e => {
                set('acceptTerms', e.target.checked);
                setErrors(prev => ({ ...prev, acceptTerms: '' }));
              }}
              aria-invalid={Boolean(touched.acceptTerms && errors.acceptTerms)}
              className="mt-0.5 h-5 w-5 rounded border-input accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              I have read, understood and agree to the{' '}
              {/* Legal pages do not exist yet; these stay inert rather than
                  pointing at a 404. Wire them when the pages ship. */}
              <a href="#" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
                Privacy Policy
              </a>
              .<span className="ml-0.5 text-destructive-text">*</span>
            </span>
          </label>
          {touched.acceptTerms && errors.acceptTerms && (
            <p role="alert" className="pl-8 text-sm text-destructive-text">
              {errors.acceptTerms}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.acceptMarketing}
            onChange={e => set('acceptMarketing', e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-input accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            Email me news and offers from DrivePluss.
          </span>
        </label>
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
        <span aria-live="polite">{isLoading ? 'Creating account…' : 'Create account'}</span>
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
};

export default SignupForm;
