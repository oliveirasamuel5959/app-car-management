import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Grid2,
  MenuItem
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../context/auth-context';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../../services/api';

const SignupForm = () => {
  const navigate = useNavigate();
  const { setIsAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CLIENT'
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    sex: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CLIENT'
  });

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

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

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
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword,
      formData.password
    );

    if (formData.name === '' || emailError || passwordError || confirmPasswordError) {
      setFormErrors({
        name: formData.name === '' ? 'Name is required' : '',
        age: formData.age === '' ? 'Age is required' : '',
        sex: formData.sex === '' ? 'Sex is required' : '',
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
        role: formData.role === '' ? 'Role is required' : ''
      });

      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userData = {
        name: formData.name,
        age: parseInt(formData.age),
        sex: formData.sex,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        role: formData.role
      };

      const response = await api.auth.register(userData);
      
      // Don't check for accessToken, just redirect after successful registration
      navigate('/login', {
        replace: true,
        state: {
          message: 'Registration successful! Please log in.',
          email: formData.email
        }
      });

    } catch (err) {
      console.error('Signup error:', err); // Debug log
      setError(err.message || 'Registration failed. Please try again.');
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
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom textAlign="center">
        Create Account
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Name"
        name="name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        error={!!formErrors.name}
        helperText={formErrors.name}
        disabled={isLoading}
        required
      />

      <TextField
        fullWidth
        label="Age"
        name="age"
        type="number"
        value={formData.age}
        onChange={handleChange}
        error={!!formErrors.age}
        helperText={formErrors.age}
        disabled={isLoading}
        required
      />

      <TextField
        fullWidth
        select
        label="Sex"
        name="sex"
        value={formData.sex}
        onChange={handleChange}
        error={!!formErrors.sex}
        helperText={formErrors.sex}
        disabled={isLoading}
        required
      >
        <MenuItem value="M">M</MenuItem>
        <MenuItem value="F">F</MenuItem>
      </TextField>

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
        select
        label="Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
        error={!!formErrors.role}
        helperText={formErrors.role}
        disabled={isLoading}
      >
        <MenuItem value="CLIENT">Client</MenuItem>
        <MenuItem value="ADMIN">Admin</MenuItem>
      </TextField>

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

      <TextField
        fullWidth
        label="Confirm Password"
        name="confirmPassword"
        type={showPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleChange}
        error={!!formErrors.confirmPassword}
        helperText={formErrors.confirmPassword}
        disabled={isLoading}
        required
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        disabled={isLoading}
        sx={{ mt: 2 }}
      >
        {isLoading ? 'Creating Account...' : 'Sign Up'}
      </Button>

      <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
        Already have an account?{' '}
        <RouterLink to="/login" style={{ textDecoration: 'none' }}>
          Login
        </RouterLink>
      </Typography>
    </Box>
  );
};

export default SignupForm;
