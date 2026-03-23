import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';

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
    if (password.length < 6) return 'Password must be at least 6 characters';
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
        setError('Invalid login response');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
      <h1 className="text-3xl font-bold text-gray-900 text-center">
        Sign in to Drive Plus
      </h1>

      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-3.5 text-base text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-5 py-3.5 text-base text-red-700">
          {error}
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-gray-700">
          Email<span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          type="email"
          name="email"
          placeholder="jean.dupont@company.com"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          required
          className={`w-full rounded-lg border px-5 py-3.5 text-base text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            formErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
          }`}
        />
        {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-gray-700">
          Password<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            required
            className={`w-full rounded-lg border px-5 py-3.5 pr-12 text-base text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-10 py-3.5 text-base font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>

      <p className="text-center text-base text-gray-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="text-blue-600 font-semibold hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
