import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';

// ── Reusable Input ────────────────────────────────────────────────────────────
const Input = ({
  label,
  error,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  required?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      {...props}
      className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
      } ${props.className ?? ''}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ── Password requirement row ──────────────────────────────────────────────────
const Req = ({ met, label }: { met: boolean; label: string }) => (
  <div className="flex items-center gap-1.5 text-xs">
    {met ? (
      <Check className="w-3.5 h-3.5 text-green-500" />
    ) : (
      <X className="w-3.5 h-3.5 text-gray-400" />
    )}
    <span className={met ? 'text-green-600' : 'text-gray-500'}>{label}</span>
  </div>
);

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+33', flag: '🇫🇷', label: 'FR' },
  { code: '+55', flag: '🇧🇷', label: 'BR' },
  { code: '+1',  flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'GB' },
  { code: '+49', flag: '🇩🇪', label: 'DE' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+39', flag: '🇮🇹', label: 'IT' },
  { code: '+351', flag: '🇵🇹', label: 'PT' },
];

// ── Main component ────────────────────────────────────────────────────────────
const SignupForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    role: 'CLIENT' as 'CLIENT' | 'WORKSHOP',
    countryCode: '+33',
    phone: '',
    password: '',
    acceptTerms: false,
    acceptMarketing: false,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Password rules ──────────────────────────────────────────────────────────
  const pwRules = useMemo(() => ({
    lowercase: /[a-z]/.test(form.password),
    uppercase: /[A-Z]/.test(form.password),
    special:   /[^a-zA-Z0-9]/.test(form.password),
    length:    form.password.length >= 12,
  }), [form.password]);

  const pwValid = Object.values(pwRules).every(Boolean);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.lastName.trim())  e.lastName = 'Last name is required';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.email.trim())     e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Invalid email format';
    if (!pwValid) e.password = 'Password does not meet requirements';
    if (!form.acceptTerms) e.acceptTerms = 'You must accept the Terms';
    return e;
  };

  const isFormValid = useMemo(() => {
    return (
      form.lastName.trim() &&
      form.firstName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      pwValid &&
      form.acceptTerms
    );
  }, [form, pwValid]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const blur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ lastName: true, firstName: true, email: true, password: true, acceptTerms: true });
    if (Object.keys(errs).length) return;

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
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Registration successful! Please log in.', email: form.email },
      });
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
      <h1 className="text-2xl font-bold text-gray-900 text-center">
        Sign up to Drive Pluss
      </h1>

      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Last Name"
          required
          placeholder="Dupont"
          value={form.lastName}
          onChange={e => set('lastName', e.target.value)}
          onBlur={() => blur('lastName')}
          error={touched.lastName ? errors.lastName : ''}
        />
        <Input
          label="First Name"
          required
          placeholder="Jean"
          value={form.firstName}
          onChange={e => set('firstName', e.target.value)}
          onBlur={() => blur('firstName')}
          error={touched.firstName ? errors.firstName : ''}
        />
      </div>

      {/* Email */}
      <Input
        label="Professional Email Address"
        required
        type="email"
        placeholder="jean.dupont@company.com"
        value={form.email}
        onChange={e => set('email', e.target.value)}
        onBlur={() => blur('email')}
        error={touched.email ? errors.email : ''}
      />

      {/* Role */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Account type<span className="text-red-500 ml-0.5">*</span>
        </label>
        <select
          value={form.role}
          onChange={e => set('role', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="CLIENT">Client</option>
          <option value="WORKSHOP">Workshop</option>
        </select>
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Phone</label>
        <div className="flex gap-2">
          <select
            value={form.countryCode}
            onChange={e => set('countryCode', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-28 flex-shrink-0"
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            placeholder="6 12 34 56 78"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Password<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 12 characters"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            onBlur={() => blur('password')}
            className={`w-full rounded-lg border px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              touched.password && errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Requirement indicators */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 pl-1">
          <Req met={pwRules.lowercase} label="At least 1 lowercase" />
          <Req met={pwRules.uppercase} label="At least 1 uppercase" />
          <Req met={pwRules.special}   label="At least 1 special character" />
          <Req met={pwRules.length}    label="Minimum 12 characters" />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={e => {
              set('acceptTerms', e.target.checked);
              setErrors(prev => ({ ...prev, acceptTerms: '' }));
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          <span className="text-sm text-gray-600">
            I have read, understood and agreed to the{' '}
            <a href="#" className="text-blue-600 underline hover:text-blue-800">
              Terms and Conditions
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 underline hover:text-blue-800">
              Privacy Policy
            </a>
            .<span className="text-red-500 ml-0.5">*</span>
          </span>
        </label>
        {touched.acceptTerms && errors.acceptTerms && (
          <p className="text-xs text-red-500 -mt-2 pl-7">{errors.acceptTerms}</p>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptMarketing}
            onChange={e => set('acceptMarketing', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          <span className="text-sm text-gray-600">
            I agree to be contacted by email with news and offers from DrivePluss.
          </span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Registering…' : 'Register'}
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-blue-600 font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

export default SignupForm;
