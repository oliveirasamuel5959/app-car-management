const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const API_BASE_URL = configuredApiBaseUrl.endsWith('/api/v1')
  ? configuredApiBaseUrl
  : `${configuredApiBaseUrl}/api/v1`;

type AddressLookupResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type Json = Record<string, unknown>;

/**
 * Read a response body as JSON, or null when there is no JSON to read.
 *
 * Never throws. A non-JSON body (an error page, an empty 204, a proxy returning
 * HTML) used to surface to the user as "Unexpected character at line 1 column 1
 * of the JSON data", which says nothing about what actually went wrong.
 */
const readJson = async (response: Response): Promise<Json | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/** Pull a human-readable message out of a backend error payload. */
const detailOf = (data: Json | null): string | null => {
  if (!data) return null;
  for (const key of ['detail', 'message', 'error']) {
    const value = data[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
};

const STATUS_FALLBACK: Record<number, string> = {
  400: 'Invalid request',
  403: 'Access forbidden',
  404: 'Resource not found',
  409: 'Conflict: Resource already exists',
  429: 'Too many requests. Please try again later.',
  500: 'Internal server error',
};

type ResponseContext = {
  /**
   * Whether *this* request actually carried an Authorization header.
   *
   * This is what distinguishes the two meanings of a 401. A 401 on an
   * authenticated request means the session expired. A 401 on one we sent
   * anonymously — /auth/login rejecting credentials — must reach the form.
   * Deciding this by looking at localStorage instead was wrong: any stale token
   * left behind (another tab, a failed logout) made a wrong password look like an
   * expired session, which reloaded the page and threw the real error away.
   */
  sentAuth: boolean;
};

/**
 * Handle API response and error handling.
 *
 * Returns `any` deliberately. Every service module declares its own return type
 * (`Promise<Workshop>`, `Promise<Schedule[]>` …) and forwards this result
 * straight through, so narrowing it here would not add safety — it would only
 * push a type error onto ~45 call sites that already annotate the shape they
 * expect. The narrowing that matters is done above: a non-JSON body is rejected
 * before it reaches a caller.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleResponse = async (response: Response, ctx: ResponseContext): Promise<any> => {
  const data = await readJson(response);
  const detail = detailOf(data);

  if (response.status === 401) {
    if (ctx.sentAuth) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Hand the reason to the login page so it can explain the redirect.
      window.location.href = '/login?reason=session-expired';
      throw new Error('Your session expired. Please log in again.');
    }
    // Anonymous request: the backend rejected the credentials we just sent.
    throw new Error(detail || 'Incorrect email or password.');
  }

  // 204 No Content carries no body by design.
  if (response.status === 204) return { success: true };

  if (!response.ok) {
    throw new Error(detail || STATUS_FALLBACK[response.status] || 'Request failed');
  }

  // A 2xx that is not JSON means something upstream answered in its place — in
  // dev, Vite serving index.html for an unbehind-proxied API path. Say so plainly
  // rather than letting JSON.parse fail with a cryptic message.
  if (data === null) {
    const contentType = response.headers.get('content-type') || 'an unknown type';
    throw new Error(
      `The server returned ${contentType} instead of JSON. ` +
        'The API may be unreachable — check that the backend is running and that the dev proxy is configured.',
    );
  }

  return data;
};

type RequestInitLite = {
  method: string;
  /** JSON-encoded into the body. */
  body?: unknown;
  /** Sent as-is; suppresses JSON encoding and the Content-Type header. */
  rawBody?: BodyInit;
  /**
   * Attach the stored Bearer token. Defaults to true; the unauthenticated auth
   * endpoints (login, register, password reset) pass false so a stale token is
   * never sent along with them.
   */
  authenticated?: boolean;
};

/** Single choke point for every request, so auth and parsing happen once. */
const request = async (endpoint: string, opts: RequestInitLite) => {
  const token = localStorage.getItem('access_token');
  const sentAuth = opts.authenticated !== false && Boolean(token);

  const headers: Record<string, string> = {};
  if (!opts.rawBody) headers['Content-Type'] = 'application/json';
  if (sentAuth) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: opts.method,
    headers,
    body: opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  });

  return handleResponse(response, { sentAuth });
};


/**
 * Main API client with all HTTP methods
 */
export const api = {
  // GET request
  get: async (endpoint: string) => request(endpoint, { method: 'GET' }),

  // POST request
  post: async (endpoint: string, data: unknown) => request(endpoint, { method: 'POST', body: data }),

  // PUT request
  put: async (endpoint: string, data: unknown) => request(endpoint, { method: 'PUT', body: data }),

  // DELETE request
  delete: async (endpoint: string) => request(endpoint, { method: 'DELETE' }),

  // PATCH request
  patch: async (endpoint: string, data: unknown) =>
    request(endpoint, { method: 'PATCH', body: data }),

  // Multipart file upload (POST). Sends FormData untouched so the browser sets
  // the multipart boundary itself.
  upload: async (endpoint: string, file: File, fieldName = 'file') => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return request(endpoint, { method: 'POST', rawBody: formData });
  },

  /**
   * Authentication endpoints.
   *
   * Every call here is unauthenticated: passing `authenticated: false` keeps a
   * stale token out of the request, so a 401 from these means "bad credentials"
   * and reaches the form instead of being mistaken for an expired session.
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
      tenant_name?: string;
    }) => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: userData,
        authenticated: false,
      });
      // Save token and user after registration
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    },

    // Login user
    login: async (credentials: { email: string; password: string }) => {
      const response = await request('/auth/login', {
        method: 'POST',
        body: credentials,
        authenticated: false,
      });

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

    /**
     * Request a password-reset link by email.
     * Backend endpoint pending — see frontend-changes.md. The UI is built and
     * type-checked; it will start working the moment /auth/forgot-password lands.
     */
    forgotPassword: async (payload: { email: string }) => {
      return request('/auth/forgot-password', {
        method: 'POST',
        body: payload,
        authenticated: false,
      });
    },

    /**
     * Complete a password reset with the token from the emailed link.
     * Backend endpoint pending — see frontend-changes.md.
     */
    resetPassword: async (payload: { token: string; password: string; password_confirm: string }) => {
      return request('/auth/reset-password', {
        method: 'POST',
        body: payload,
        authenticated: false,
      });
    },

    // Logout
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },
  },

  location: {
    searchAddress: async (query: string): Promise<AddressLookupResult[]> => {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: query,
        limit: '5',
        addressdetails: '1',
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to look up address');
      }

      return response.json();
    },
  },

  workshops: {
    create: async (workshopData: {
      name: string;
      email?: string | null;
      description: string;
      latitude: number;
      longitude: number;
      rating_avg?: number;
    }) => {
      return api.post('/workshops/', workshopData);
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
    // Get the authenticated user's full profile (includes phone/address/avatar)
    getProfile: async () => {
      return api.get('/users/me');
    },

    // Update the authenticated user's profile
    updateProfile: async (userData: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      avatar_url?: string | null;
    }) => {
      return api.put('/users/me', userData);
    },

    // Upload a profile photo; returns the updated user
    uploadAvatar: async (file: File) => {
      return api.upload('/users/me/avatar', file);
    },

    // Get user by ID
    getById: async (userId: number) => {
      return api.get(`/users/${userId}`);
    },
  },
};

export default api;

