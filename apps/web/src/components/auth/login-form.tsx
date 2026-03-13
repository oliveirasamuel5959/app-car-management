import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setIsAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [formErrors, setFormErrors] = useState({
    email: '',
    password: ''
  });

  // Add state for success message
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ''
  );

  // Pre-fill email if coming from signup
  useEffect(() => {
    if (location.state?.email) {
      setFormData(prev => ({
        ...prev,
        email: location.state.email
      }));
    }
  }, [location.state]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!re.test(email)) return 'Invalid email format';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user types
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    
    if (emailError || passwordError) {
      setFormErrors({
        email: emailError,
        password: passwordError
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.auth.login(formData);

      if (response.access_token) {
        login(response); // Pass the entire response
        // Redirect based on user role
        const redirectPath = response.user?.role === 'WORKSHOP' 
          ? '/workshop/dashboard' 
          : '/client/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setError('Invalid login response');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2.5,
        '& .MuiInputBase-input': { fontSize: '1.2rem' },
        '& .MuiInputLabel-root': { fontSize: '1.2rem' },
        '& .MuiFormHelperText-root': { fontSize: '0.95rem' },
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', fontWeight: 700, color: '#111827' }}>
        Welcome Back
      </Typography>
      <Typography variant="body1" sx={{ textAlign: 'center', color: '#6B7280', mb: 2 }}>
        Sign in to your account to continue
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={!!formErrors.email}
        helperText={formErrors.email}
        disabled={isLoading}
        required
      />

      <TextField
        fullWidth
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleChange}
        error={!!formErrors.password}
        helperText={formErrors.password}
        disabled={isLoading}
        required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={togglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{
          mt: 2,
          bgcolor: '#2563EB',
          '&:hover': { bgcolor: '#1D4ED8' },
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1.1rem',
          borderRadius: 2,
          py: 1.8,
          boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
        }}
      >
        {isLoading ? 'Logging in...' : 'Sign In'}
      </Button>

      <Typography variant="body1" textAlign="center" sx={{ mt: 2, color: '#6B7280' }}>
        Don't have an account?{' '}
        <Button
          onClick={() => navigate('/signup')}
          sx={{ textTransform: 'none', color: '#2563EB', fontWeight: 600, fontSize: '1rem', p: 0, minWidth: 'auto' }}
        >
          Sign up
        </Button>
      </Typography>
    </Box>
  );
};

export default LoginForm;
