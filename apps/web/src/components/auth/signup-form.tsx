import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../lib/errors';
import {
  Checkbox,
  ErrorSummary,
  Field,
  FormAlert,
  Input,
  PasswordRequirements,
  Req,
  SubmitButton,
  Textarea,
  controlClasses,
} from '../ui/field';

type AccountRole = 'CLIENT' | 'WORKSHOP';
type AddressResult = {
  display_name: string;
  lat: string;
  lon: string;
};

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

/** Maps a validation key to the id of the control it belongs to, for the summary. */
const ERROR_FIELD_IDS: Record<string, string> = {
  firstName: 'signup-first-name',
  lastName: 'signup-last-name',
  email: 'signup-email',
  password: 'signup-password',
  acceptTerms: 'signup-terms',
  workshopName: 'signup-workshop-name',
  workshopEmail: 'signup-workshop-email',
  workshopDescription: 'signup-workshop-description',
  workshopAddressQuery: 'signup-workshop-address',
  // Coordinates are entered in two fields; the address control owns the error.
  workshopLocation: 'signup-workshop-address',
};

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
  // Once a submit has been attempted, every error surfaces at once — inline and
  // in the summary — instead of waiting for each field to be visited. Without
  // this, a field the user never touched (the workshop coordinates) could hold
  // the only remaining error while the summary rendered nothing, so the form
  // appeared to do nothing at all.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Bumped on every failed submit so the summary re-focuses on a repeat submit.
  const [focusToken, setFocusToken] = useState(0);

  // ── Validate ────────────────────────────────────────────────────────────────
  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // ── Password rules — mirror the backend contract exactly
  //    (UserRegister: >=8 chars, one uppercase, one digit).
  const pwRules = useMemo(
    () => ({
      length: form.password.length >= 8,
      uppercase: /[A-Z]/.test(form.password),
      digit: /[0-9]/.test(form.password),
    }),
    [form.password],
  );

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
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!validateEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (!pwValid) e.password = 'Password does not meet the requirements below';
    if (!form.acceptTerms) e.acceptTerms = 'Please accept the Terms and Privacy Policy to continue';
    if (isWorkshop) {
      if (!form.workshopName.trim()) e.workshopName = 'Workshop name is required';
      if (!form.workshopEmail.trim()) e.workshopEmail = 'Workshop email is required';
      else if (!validateEmail(form.workshopEmail))
        e.workshopEmail = 'Enter a valid workshop email address';
      if (!form.workshopDescription.trim())
        e.workshopDescription = 'Workshop description is required';
      if (!workshopAddressQuery.trim()) e.workshopAddressQuery = 'Workshop address is required';
      // Coordinates are the real requirement; they arrive either from the
      // address lookup or from manual entry.
      if (!hasCoords) e.workshopLocation = 'Look up the address, or enter the latitude and longitude manually';
    }
    return e;
  };

  /**
   * A field shows its error once the user has left it, or once a submit has been
   * attempted. Blur alone must not surface an error for a field the user has not
   * reached — leaving "Workshop name" used to pop the coordinates error, which
   * also sat outside the summary because that key was never marked touched.
   */
  const showError = (key: string) =>
    (submitAttempted || touched[key] ? errors[key] : '') ?? '';

  // ── Handlers ────────────────────────────────────────────────────────────────
  /** Clears the given error keys, so a corrected field stops being flagged. */
  const clearErrors = (...keys: string[]) =>
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Drop this field's error as soon as the user edits it; it is re-validated on
    // blur and on the next submit.
    if (field === 'workshopLatitude' || field === 'workshopLongitude') {
      clearErrors(field, 'workshopLocation');
    } else {
      clearErrors(field);
    }
  };

  const blur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleRoleChange = (value: string) => {
    const nextRole = value as AccountRole;
    setForm((prev) => ({
      ...prev,
      role: nextRole,
      workshopEmail:
        nextRole === 'WORKSHOP' && !prev.workshopEmail ? prev.email : prev.workshopEmail,
    }));
    if (nextRole !== 'WORKSHOP') {
      clearErrors(
        'workshopName',
        'workshopEmail',
        'workshopDescription',
        'workshopAddressQuery',
        'workshopLocation',
      );
    }
  };

  const handleWorkshopAddressChange = (value: string) => {
    setWorkshopAddressQuery(value);
    setSelectedAddress('');
    setAddressResults([]);
    setForm((prev) => ({ ...prev, workshopLatitude: '', workshopLongitude: '' }));
    clearErrors('workshopAddressQuery', 'workshopLocation');
  };

  const searchAddress = async () => {
    if (!workshopAddressQuery.trim()) {
      setTouched((prev) => ({ ...prev, workshopAddressQuery: true }));
      setErrors((prev) => ({ ...prev, workshopAddressQuery: 'Workshop address is required' }));
      return;
    }

    setIsSearchingAddress(true);
    setServerError('');

    try {
      const results = await api.location.searchAddress(workshopAddressQuery.trim());
      setAddressResults(results);

      if (!results.length) {
        setErrors((prev) => ({
          ...prev,
          workshopAddressQuery:
            'No address matches found. Try a more specific search, or enter coordinates manually.',
        }));
        setManualCoords(true);
      } else {
        clearErrors('workshopAddressQuery', 'workshopLocation');
      }
    } catch (err: unknown) {
      setAddressResults([]);
      setManualCoords(true);
      setServerError(
        getErrorMessage(err, 'Address lookup failed. Enter the coordinates manually below.'),
      );
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddress = (result: AddressResult) => {
    setSelectedAddress(result.display_name);
    setWorkshopAddressQuery(result.display_name);
    setAddressResults([]);
    setForm((prev) => ({ ...prev, workshopLatitude: result.lat, workshopLongitude: result.lon }));
    setTouched((prev) => ({ ...prev, workshopAddressQuery: true }));
    clearErrors('workshopAddressQuery', 'workshopLocation');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setSubmitAttempted(true);
    setTouched((prev) => ({
      ...prev,
      lastName: true,
      firstName: true,
      email: true,
      password: true,
      acceptTerms: true,
      workshopName: true,
      workshopEmail: true,
      workshopDescription: true,
      workshopAddressQuery: true,
      workshopLocation: true,
    }));

    if (Object.keys(errs).length) {
      // Re-focus the summary so the failures are announced, then the user can
      // jump straight to the field that matters.
      setFocusToken((n) => n + 1);
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
      setFocusToken((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
  };

  // Every validation message already names its own field ("Email is required"),
  // so the summary lists them verbatim rather than prefixing a label.
  const summaryErrors = Object.keys(errors)
    .filter((key) => errors[key] && (submitAttempted || touched[key]))
    .map((key) => ({
      fieldId: ERROR_FIELD_IDS[key] ?? key,
      message: errors[key],
    }));

  const addressHasError = Boolean(showError('workshopAddressQuery'));
  const locationError = showError('workshopLocation');
  // Both ids are conditional so `aria-describedby` never points at an element
  // that is not rendered.
  const addressDescribedBy =
    [
      addressHasError ? 'signup-workshop-address-error' : null,
      locationError ? 'signup-workshop-location-error' : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
        <header>
          <h1 className="text-center font-display text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Free to get started — no credit card required.
          </p>
        </header>

        {serverError && <FormAlert variant="error">{serverError}</FormAlert>}
        <ErrorSummary id="signup-error-summary" errors={summaryErrors} focusToken={focusToken} />

        {/* Name row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="signup-first-name"
            label="First name"
            required
            autoComplete="given-name"
            placeholder="Jean"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            onBlur={() => blur('firstName')}
            error={showError('firstName')}
          />
          <Input
            id="signup-last-name"
            label="Last name"
            required
            autoComplete="family-name"
            placeholder="Dupont"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            onBlur={() => blur('lastName')}
            error={showError('lastName')}
          />
        </div>

        {/* Email */}
        <Input
          id="signup-email"
          label="Email"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          onBlur={() => blur('email')}
          error={showError('email')}
        />

        {/* Role */}
        <Field
          label="Account type"
          htmlFor="signup-account-type"
          required
          hint={
            isWorkshop
              ? 'Register your workshop to receive and manage service orders.'
              : 'Manage your vehicles, book workshops and track every service.'
          }
        >
          <select
            id="signup-account-type"
            value={form.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className={controlClasses(false)}
          >
            <option value="CLIENT">Vehicle owner</option>
            <option value="WORKSHOP">Workshop</option>
          </select>
        </Field>

        {isWorkshop && (
          <section
            aria-labelledby="workshop-details-heading"
            className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 px-4 py-5"
          >
            <div>
              <h2
                id="workshop-details-heading"
                className="font-display text-lg font-bold text-foreground"
              >
                Workshop details
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These details are saved to your public workshop profile.
              </p>
            </div>

            <Input
              id="signup-workshop-name"
              label="Workshop name"
              required
              autoComplete="organization"
              placeholder="Downtown Auto Care"
              value={form.workshopName}
              onChange={(e) => set('workshopName', e.target.value)}
              onBlur={() => blur('workshopName')}
              error={showError('workshopName')}
            />

            <Input
              id="signup-workshop-email"
              label="Workshop email"
              required
              type="email"
              autoComplete="email"
              placeholder="contact@yourworkshop.com"
              value={form.workshopEmail}
              onChange={(e) => set('workshopEmail', e.target.value)}
              onBlur={() => blur('workshopEmail')}
              error={showError('workshopEmail')}
            />

            <Textarea
              id="signup-workshop-description"
              label="Workshop description"
              required
              placeholder="Specialities, years in business, brands you service"
              value={form.workshopDescription}
              onChange={(e) => set('workshopDescription', e.target.value)}
              onBlur={() => blur('workshopDescription')}
              rows={4}
              error={showError('workshopDescription')}
            />

            <Field
              label="Workshop address"
              htmlFor="signup-workshop-address"
              required
              error={addressHasError ? errors.workshopAddressQuery : ''}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="signup-workshop-address"
                  autoComplete="street-address"
                  placeholder="Street, neighbourhood, city"
                  value={workshopAddressQuery}
                  onChange={(e) => handleWorkshopAddressChange(e.target.value)}
                  onBlur={() => blur('workshopAddressQuery')}
                  aria-invalid={addressHasError || Boolean(locationError) ? true : undefined}
                  aria-describedby={addressDescribedBy}
                  className={controlClasses(addressHasError)}
                />
                <button
                  type="button"
                  onClick={searchAddress}
                  disabled={isSearchingAddress}
                  className="shrink-0 rounded-lg border border-input bg-card px-4 py-3 text-sm font-semibold text-primary-text transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSearchingAddress ? 'Searching…' : 'Find address'}
                </button>
              </div>

              {addressResults.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  {addressResults.map((result) => (
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
                    {Number(form.workshopLatitude).toFixed(5)},{' '}
                    {Number(form.workshopLongitude).toFixed(5)}
                  </p>
                </div>
              )}

              {/* Manual coordinate fallback — keeps signup possible when the
                  address lookup is unavailable or returns nothing. */}
              <button
                type="button"
                onClick={() => setManualCoords((v) => !v)}
                aria-expanded={manualCoords}
                aria-controls="signup-manual-coords"
                className="mt-1 inline-flex min-h-6 w-fit items-center gap-1 text-xs font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${
                    manualCoords ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
                {manualCoords ? 'Hide manual coordinates' : 'Enter coordinates manually'}
              </button>

              {manualCoords && (
                <div id="signup-manual-coords" className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    id="signup-latitude"
                    label="Latitude"
                    inputMode="decimal"
                    placeholder="-23.55052"
                    value={form.workshopLatitude}
                    onChange={(e) => set('workshopLatitude', e.target.value)}
                    onBlur={() => blur('workshopLocation')}
                  />
                  <Input
                    id="signup-longitude"
                    label="Longitude"
                    inputMode="decimal"
                    placeholder="-46.63331"
                    value={form.workshopLongitude}
                    onChange={(e) => set('workshopLongitude', e.target.value)}
                    onBlur={() => blur('workshopLocation')}
                  />
                </div>
              )}

              {/* Rendered inside the Field so the address control can point its
                  aria-describedby at it; it was previously orphaned. */}
              {locationError && (
                <p id="signup-workshop-location-error" className="text-sm text-destructive-text">
                  {locationError}
                </p>
              )}
            </Field>
          </section>
        )}

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-phone" className="text-sm font-medium text-foreground">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Country code"
              value={form.countryCode}
              onChange={(e) => set('countryCode', e.target.value)}
              className={controlClasses(false, 'w-28 shrink-0 px-3')}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              id="signup-phone"
              type="tel"
              autoComplete="tel"
              placeholder="11 2596-1145"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={controlClasses(false, 'min-w-0 flex-1')}
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
            Password
            <span className="ml-0.5 text-destructive-text" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              onBlur={() => blur('password')}
              aria-invalid={showError('password') ? true : undefined}
              aria-describedby={
                showError('password')
                  ? 'signup-password-requirements signup-password-error'
                  : 'signup-password-requirements'
              }
              className={controlClasses(Boolean(showError('password')), 'pr-12')}
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

          <PasswordRequirements id="signup-password-requirements">
            <Req met={pwRules.length} label="At least 8 characters" />
            <Req met={pwRules.uppercase} label="One uppercase letter" />
            <Req met={pwRules.digit} label="One number" />
          </PasswordRequirements>

          {showError('password') && (
            <p id="signup-password-error" className="text-sm text-destructive-text">
              {showError('password')}
            </p>
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-3">
          <Checkbox
            id="signup-terms"
            checked={form.acceptTerms}
            onChange={(checked) => {
              set('acceptTerms', checked);
              clearErrors('acceptTerms');
            }}
            error={showError('acceptTerms')}
          >
            I have read, understood and agree to the{' '}
            {/* Legal pages do not exist yet; these stay inert rather than
                pointing at a 404. Wire them when the pages ship. */}
            <a
              href="#"
              className="font-medium text-primary-text underline underline-offset-4 hover:text-primary-text/80"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="#"
              className="font-medium text-primary-text underline underline-offset-4 hover:text-primary-text/80"
            >
              Privacy Policy
            </a>
            .
          </Checkbox>

          <Checkbox
            checked={form.acceptMarketing}
            onChange={(checked) => set('acceptMarketing', checked)}
          >
            Email me news and offers from DrivePluss.
          </Checkbox>
        </div>

        <SubmitButton isLoading={isLoading} loadingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>

      {/* Outside the form: it is navigation, not a form control, so it should
          not be part of the form's submit semantics. */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="inline-flex min-h-6 items-center font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign in
        </Link>
      </p>
    </>
  );
};

export default SignupForm;
