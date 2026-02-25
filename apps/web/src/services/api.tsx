const BASE_URL = 'http://localhost:5500';

/**
 * Get authentication headers with Bearer token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Get headers for form data (multipart)
 */
// const getFormDataHeaders = () => {
//   const token = localStorage.getItem('access_token');
//   return {
//     ...(token && { 'Authorization': `Bearer ${token}` }),
//   };
// };

/**
 * Handle API response and error handling
 */
const handleResponse = async (response: Response) => {

  // const res_data = await response.json();

  console.log("API Response Status:", response);
  // console.log("API Response Body:", res_data); // ← IMPORTANT

  // Handle 401 Unauthorized - redirect to login
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    const data = await response.json();
    throw new Error(data.detail || 'Access forbidden');
  }

  // Handle 404 Not Found
  if (response.status === 404) {
    const data = await response.json();
    throw new Error(data.detail || 'Resource not found');
  }

  // Handle 409 Conflict
  if (response.status === 409) {
    const data = await response.json();
    throw new Error(data.detail || 'Conflict: Resource already exists');
  }

  // Handle 429 Too Many Requests
  if (response.status === 429) {
    const data = await response.json();
    throw new Error(data.detail || 'Too many requests. Please try again later.');
  }

  // Handle 400 Bad Request
  if (response.status === 400) {
    const data = await response.json();
    throw new Error(data.detail || 'Invalid request');
  }

  // Handle 500 Internal Server Error
  if (response.status === 500) {
    const data = await response.json();
    throw new Error(data.detail || 'Internal server error');
  }

  // Parse response
  const data = await response.json();

  // Check if response is not ok
  if (!response.ok) {
    throw new Error(data.detail || data.message || data.error || 'Request failed');
  }

  console.log('API Response:', data);
  return data;
};

/**
 * Main API client with all HTTP methods
 */
export const api = {
  // GET request
  get: async (endpoint: string) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // POST request
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // PUT request
  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // DELETE request
  delete: async (endpoint: string) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    return handleResponse(response);
  },

  // PATCH request
  patch: async (endpoint: string, data: any) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Authentication endpoints
   */
  auth: {
    // Register new user
    register: async (userData: {
      name: string;
      age: number;
      email: string;
      sex: string;
      password: string;
      password_confirm: string;
      role?: 'CLIENT' | 'WORKSHOP';
    }) => {
      const response = await api.post('/auth/register', userData);
      // Save token and user after registration
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    },

    // Login user
    login: async (credentials: { email: string; password: string }) => {
      const response = await api.post('/auth/login', credentials);

      // Save token and user after login
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    },

    // Get current user info
    getCurrentUser: async () => {
      return api.get('/auth/me');
    },

    // Logout
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },
  },

  /**
   * Vehicle endpoints
   */
  vehicles: {
    // Get all vehicles for current user
    list: async () => {
      return api.get('/vehicles/');
    },

    // Get specific vehicle by ID
    get: async (vehicleId: number) => {
      return api.get(`/vehicles/${vehicleId}`);
    },

    // Create new vehicle
    create: async (vehicleData: {
      brand: string;
      model: string;
      year: number;
      plate: string;
    }) => {
      return api.post('/vehicles/', vehicleData);
    },

    // Update vehicle (if backend implements PUT)
    update: async (vehicleId: number, vehicleData: any) => {
      return api.put(`/vehicles/${vehicleId}`, vehicleData);
    },

    // Delete vehicle
    delete: async (vehicleId: number) => {
      return api.delete(`/vehicles/${vehicleId}`);
    },
  },

  /**
   * User endpoints
   */
  users: {
    // Get user profile
    getProfile: async () => {
      return api.get('/auth/me');
    },

    // Update user profile (if backend implements)
    updateProfile: async (userData: any) => {
      return api.put('/users/profile', userData);
    },

    // Get user by ID
    getById: async (userId: number) => {
      return api.get(`/users/${userId}`);
    },
  },
};

export default api;

