# CORS Configuration Guide

This guide explains the CORS (Cross-Origin Resource Sharing) setup for the FastAPI backend and React frontend integration.

## What is CORS?

CORS allows the React frontend (running on a different domain/port) to make requests to the FastAPI backend. Without CORS, browsers block cross-origin requests for security reasons.

## Current Configuration

### Backend CORS Settings
The backend is configured to allow requests from:

```
Development:
- http://localhost:5173    (Vite - default)
- http://localhost:3000    (Create React App)
- http://127.0.0.1:5173
- http://127.0.0.1:3000
```

**Allowed Methods:**
- GET, POST, PUT, DELETE, OPTIONS, PATCH

**Allowed Headers:**
- All headers (*)

**Credentials:**
- Allowed (for cookies, auth tokens)

## Environment Variables

CORS settings are configured in `.env`:

```bash
# CORS Settings
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH
CORS_ALLOW_HEADERS=*
```

## React Frontend Integration

### 1. Install Axios (HTTP Client)

```bash
npm install axios
```

### 2. Create API Client

Create `src/api/client.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5500';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // Important: include credentials
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### 3. Authentication Hook

Create `src/hooks/useAuth.js`:

```javascript
import { useState } from 'react';
import apiClient from '../api/client';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { access_token } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      const { access_token } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  };

  return { register, login, logout, loading, error };
};
```

### 4. Protected Route Component

Create `src/components/ProtectedRoute.jsx`:

```javascript
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
```

### 5. Login Component Example

```javascript
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};
```

### 6. API Call Example

```javascript
import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await apiClient.get('/vehicles/');
        setVehicles(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Vehicles</h2>
      {vehicles.length === 0 ? (
        <p>No vehicles found</p>
      ) : (
        <ul>
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              {vehicle.brand} {vehicle.model} ({vehicle.year})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Cause:** Backend is not allowing the frontend origin

**Solution:**
1. Check frontend URL matches one in `CORS_ORIGINS` env variable
2. Verify backend is running on correct port
3. Check `.env` file has correct CORS settings

```bash
# Development example:
# If frontend is on: http://localhost:5173
# Then CORS_ORIGINS must include: http://localhost:5173
```

### 401 Unauthorized on Protected Routes

**Cause:** Token not being sent with requests

**Solution:**
1. Ensure token is saved in localStorage after login
2. Check `withCredentials: true` in axios client
3. Verify Authorization header is being sent:

```javascript
// Add logging to verify token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  console.log('Using token:', token ? 'Present' : 'Missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### CORS Preflight Request Failing

**Cause:** Preflight (OPTIONS) request not allowed

**Solution:**
The backend is configured to automatically handle preflight requests. If still having issues:

1. Verify `CORS_ALLOW_METHODS` includes OPTIONS
2. Check `CORS_ALLOW_HEADERS` is set to "*"

### Token Expired Error

**Cause:** JWT token expired after 24 hours

**Solution:**
1. User must login again to get new token
2. Implement token refresh endpoint (optional enhancement)

```javascript
// Clear token and redirect to login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Production Configuration

For production, update `.env` with production domain:

```bash
# Production example
CORS_ORIGINS=https://app.example.com,https://www.example.com
CORS_ALLOW_CREDENTIALS=true
```

## Backend CORS Code Location

- **Configuration:** `apps/backend/app/src/main.py` (lines 42-48)
- **Settings:** `apps/backend/app/src/core/config.py` (CORS properties)
- **Environment:** `apps/backend/.env`

## Complete API Endpoints Reference

### Auth Endpoints (No Auth Required)

```
POST   /auth/register   - Register new user
POST   /auth/login      - Login user
```

### Auth Endpoints (Auth Required)

```
GET    /auth/me         - Get current user
```

### Vehicle Endpoints (Auth Required)

```
POST   /vehicles/       - Create vehicle
GET    /vehicles/       - Get all user vehicles
GET    /vehicles/{id}   - Get specific vehicle
DELETE /vehicles/{id}   - Delete vehicle
```

### Users Endpoints (Auth Required)

```
POST   /users/          - Create user
```

## Testing CORS with curl

```bash
# Test preflight request
curl -X OPTIONS http://localhost:5500/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Login
curl -X POST http://localhost:5500/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'

# Protected endpoint
TOKEN="your_token_here"
curl -X GET http://localhost:5500/vehicles/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:5173"
```

## Summary

✅ CORS is fully configured for development
✅ React frontend can make requests to backend
✅ JWT tokens are sent with each request
✅ Protected routes validate authentication
✅ Easy to add more allowed origins for different environments
