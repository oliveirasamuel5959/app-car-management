# Frontend API Integration Guide

## Updated API Client (api.tsx)

The frontend API client is now fully configured to work with your FastAPI backend with complete JWT token authentication support.

## Key Features

✅ **Token Persistence** - Stores `access_token` in localStorage after login/register
✅ **Auto Headers** - Automatically adds Bearer token to all authenticated requests
✅ **Error Handling** - Comprehensive error handling for all HTTP status codes
✅ **Multiple HTTP Methods** - GET, POST, PUT, DELETE, PATCH support
✅ **Organized Endpoints** - Grouped by resource (auth, vehicles, users)
✅ **TypeScript Support** - Type-safe endpoint definitions

## Usage Examples

### 1. User Registration

```typescript
import api from '@/services/api';

// Register new user
async function handleRegister(userData) {
  try {
    const response = await api.auth.register({
      name: 'John Doe',
      age: 25,
      email: 'john@example.com',
      sex: 'Male',
      password: 'SecurePass123',
      password_confirm: 'SecurePass123',
      role: 'CLIENT'
    });

    console.log('Registration successful!');
    console.log('Token:', response.access_token);
    console.log('User:', response.user);

    // Token and user are automatically saved to localStorage
    // App can now make authenticated requests
  } catch (error) {
    console.error('Registration failed:', error.message);
  }
}
```

### 2. User Login

```typescript
async function handleLogin(email, password) {
  try {
    const response = await api.auth.login({
      email: 'john@example.com',
      password: 'SecurePass123'
    });

    console.log('Login successful!');
    console.log('User:', response.user);

    // Token automatically saved - redirect to dashboard
    // window.location.href = '/dashboard';
  } catch (error) {
    console.error('Login failed:', error.message);
    // Display error to user
  }
}
```

### 3. Get Current User

```typescript
async function loadUserProfile() {
  try {
    const user = await api.auth.getCurrentUser();
    console.log('Current user:', user);
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error.message);
  }
}
```

### 4. Create Vehicle

```typescript
async function handleCreateVehicle() {
  try {
    const vehicle = await api.vehicles.create({
      brand: 'Toyota',
      model: 'Corolla',
      year: 2023,
      plate: 'ABC-1234'
    });

    console.log('Vehicle created:', vehicle);
    return vehicle;
  } catch (error) {
    console.error('Failed to create vehicle:', error.message);
    // Handle specific errors
    if (error.message.includes('already exists')) {
      console.log('Plate already exists');
    }
    if (error.message.includes('already have')) {
      console.log('User already has a vehicle');
    }
  }
}
```

### 5. Get All User Vehicles

```typescript
async function loadVehicles() {
  try {
    const vehicles = await api.vehicles.list();
    console.log('Vehicles:', vehicles);
    return vehicles;
  } catch (error) {
    console.error('Failed to fetch vehicles:', error.message);
  }
}
```

### 6. Get Specific Vehicle

```typescript
async function getVehicleDetails(vehicleId) {
  try {
    const vehicle = await api.vehicles.get(vehicleId);
    console.log('Vehicle details:', vehicle);
    return vehicle;
  } catch (error) {
    console.error('Failed to fetch vehicle:', error.message);
  }
}
```

### 7. Delete Vehicle

```typescript
async function handleDeleteVehicle(vehicleId) {
  try {
    const result = await api.vehicles.delete(vehicleId);
    console.log('Vehicle deleted successfully');
    return result;
  } catch (error) {
    console.error('Failed to delete vehicle:', error.message);
  }
}
```

### 8. Logout

```typescript
function handleLogout() {
  api.auth.logout();
  // User will be redirected to /login automatically
}
```

## React Component Examples

### Login Component

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.auth.login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
}
```

### Vehicle List Component

```typescript
import { useEffect, useState } from 'react';
import api from '@/services/api';

export function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await api.vehicles.list();
      setVehicles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId) => {
    try {
      await api.vehicles.delete(vehicleId);
      await loadVehicles(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h2>My Vehicles</h2>
      {vehicles.length === 0 ? (
        <p>No vehicles found</p>
      ) : (
        <ul>
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <span>{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
              <button onClick={() => handleDelete(vehicle.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Create Vehicle Component

```typescript
import { useState } from 'react';
import api from '@/services/api';

export function CreateVehicleForm() {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const vehicle = await api.vehicles.create(formData);
      setSuccess('Vehicle created successfully!');
      setFormData({ brand: '', model: '', year: new Date().getFullYear(), plate: '' });
      console.log('Created vehicle:', vehicle);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="brand"
        value={formData.brand}
        onChange={handleChange}
        placeholder="Brand (e.g., Toyota)"
        required
      />
      <input
        type="text"
        name="model"
        value={formData.model}
        onChange={handleChange}
        placeholder="Model (e.g., Corolla)"
        required
      />
      <input
        type="number"
        name="year"
        value={formData.year}
        onChange={handleChange}
        placeholder="Year"
        required
      />
      <input
        type="text"
        name="plate"
        value={formData.plate}
        onChange={handleChange}
        placeholder="License Plate"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Vehicle'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </form>
  );
}
```

### Protected Route Component

```typescript
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Usage in App routing:
// <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>} path="/dashboard" />
```

## Authentication Flow

### 1. Registration/Login
```
User fills form
    ↓
api.auth.register() or api.auth.login()
    ↓
Backend validates credentials
    ↓
Returns access_token + user data
    ↓
Token saved to localStorage
    ↓
User data saved to localStorage
    ↓
Ready for authenticated requests
```

### 2. Authenticated Requests
```
Component calls api.vehicles.list()
    ↓
getAuthHeaders() reads token from localStorage
    ↓
Adds "Authorization: Bearer {token}" header
    ↓
Makes request to backend
    ↓
Backend validates token
    ↓
Returns protected data
```

### 3. Token Expiration
```

## Workshop Search & Google Maps

The `WorkshopsPage` displays a Google Map centered on your current location or a
searched address and plots nearby workshops returned by the backend.

### Setup
1. Install the new dependency:
   ```bash
   cd apps/web
   npm install @react-google-maps/api
   # or yarn add @react-google-maps/api
   ```
2. Create a `.env` (or use your existing Vite env) with:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
   ```
3. The map component (`WorkshopMapGoogle`) uses `useJsApiLoader` so no
   additional `<script>` tags are needed; the key is loaded automatically.

### Usage
* Click **Use My Location** to center the map on your GPS coordinates (prompt
grabbed from the browser).
* Type an address and hit **Search** to geocode with Google and view nearby
workshops.

---

### 3. Token Expiration
```
Token expired (24 hours)
    ↓
Request returns 401 Unauthorized
    ↓
handleResponse() catches 401
    ↓
Removes token from localStorage
    ↓
Redirects to /login
    ↓
User must login again
```

## Error Handling

The API client automatically handles these error codes from the backend:

| Code | Meaning | Handling |
|------|---------|----------|
| 400 | Invalid request | Show validation errors |
| 401 | Unauthorized (token invalid/expired) | Clear token, redirect to login |
| 403 | Forbidden (no permission) | Show permission error |
| 404 | Not found | Show "resource not found" |
| 409 | Conflict (plate exists) | Show "already exists" error |
| 429 | Rate limited | Show "too many requests" error |
| 500 | Server error | Show generic error |

## Common Issues & Solutions

### Issue: Token not being sent
**Solution:** Check that token is saved after login:
```typescript
// After login, verify token exists
console.log(localStorage.getItem('access_token'));
```

### Issue: 401 Unauthorized on protected routes
**Solution:** Make sure to login first and token is in localStorage

### Issue: "Session expired" on every request
**Solution:** Check if JWT_EXPIRATION_HOURS is set correctly in backend .env

### Issue: CORS error
**Solution:** Verify frontend port is in backend CORS_ORIGINS:
```bash
# Backend .env
CORS_ORIGINS=http://localhost:5173,...
```

## API Endpoints Summary

**Auth:**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

**Vehicles:**
- `GET /vehicles/` - List user's vehicles
- `GET /vehicles/{id}` - Get vehicle details
- `POST /vehicles/` - Create vehicle
- `DELETE /vehicles/{id}` - Delete vehicle

**Users:**
- `GET /users/{id}` - Get user by ID

All endpoints require `Authorization: Bearer {token}` header except register and login.
