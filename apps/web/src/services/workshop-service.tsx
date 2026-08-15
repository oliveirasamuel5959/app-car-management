import { api } from './api';

export interface Workshop {
  id: number;
  tenant_id: string;
  name: string;
  email?: string | null;
  description?: string | null;
  latitude: number;
  longitude: number;
  rating_avg: number;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  opening_hours?: string | null;
  logo_url?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  work_days?: string | null;
  employee_count?: number | null;
  user_id: number;
}

export interface WorkshopUpdate {
  name?: string;
  email?: string | null;
  description?: string | null;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  opening_hours?: string | null;
  logo_url?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  work_days?: string | null;
  employee_count?: number | null;
}

export interface WorkshopSearchItem {
  id: number;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  rating_avg: number;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  logo_url?: string | null;
  distance_km?: number | null;
  service_types?: string[];
  ratings_count?: number;
}

export type WorkshopSort = 'distance' | 'rating' | 'reviews';

export interface WorkshopSearchParams {
  name?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minRating?: number | null;
  serviceTypes?: string[];
  sort?: WorkshopSort;
  skip?: number;
  limit?: number;
}

/** PT labels for the service-type taxonomy (backend `ServiceRequestType`). */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  reparo: 'Reparo',
  inspecao: 'Inspeção',
  outro: 'Outro',
};

export interface WorkshopServiceItem {
  id: number;
  workshop_id: number;
  service_type: string;
}

export const workshopService = {
  getCurrentWorkshop: async (): Promise<Workshop> => {
    try {
      const response = await api.get('/workshops/me');
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch current workshop');
    }
  },

  updateCurrentWorkshop: async (data: WorkshopUpdate): Promise<Workshop> => {
    return api.put('/workshops/me', data);
  },

  uploadLogo: async (file: File): Promise<Workshop> => {
    return api.upload('/workshops/me/logo', file);
  },

  /**
   * Search workshops with optional filters (name, location, min rating,
   * offered service types) and sorting. Mirrors the backend
   * `GET /workshops/` contract.
   */
  searchWorkshops: async (
    params: WorkshopSearchParams = {},
  ): Promise<WorkshopSearchItem[]> => {
    const search = new URLSearchParams();
    if (params.name) search.set('name', params.name);
    if (params.lat !== undefined) search.set('lat', String(params.lat));
    if (params.lng !== undefined) search.set('lng', String(params.lng));
    if (params.radiusKm !== undefined) search.set('radius_km', String(params.radiusKm));
    if (params.minRating !== undefined && params.minRating !== null) {
      search.set('min_rating', String(params.minRating));
    }
    if (params.serviceTypes && params.serviceTypes.length > 0) {
      search.set('service_types', params.serviceTypes.join(','));
    }
    if (params.sort) search.set('sort', params.sort);
    search.set('skip', String(params.skip ?? 0));
    search.set('limit', String(params.limit ?? 50));
    return api.get(`/workshops/?${search.toString()}`);
  },

  getWorkshopUsers: async (workshopId: number) => {
    const response = await api.get(`/workshops/${workshopId}/clients`);
    console.log('getWorkshopUsers response:', response);
    return response;
  },

  getServicesByUser: async (userId: string | undefined) => {
    const response = await api.get(
      `/workshop/users/${userId}/services`
    );
    return response.data;
  },

  getWorkshopById: async (workshopId: number) => {
    try {
      const response = await api.get(`/workshops/${workshopId}`);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch workshop');
    }
  },

  listWorkshops: async (skip = 0, limit = 50): Promise<WorkshopSearchItem[]> => {
    const search = new URLSearchParams();
    search.set('skip', String(skip));
    search.set('limit', String(limit));
    return api.get(`/workshops/?${search.toString()}`);
  },

  getMyWorkshopServices: async (): Promise<WorkshopServiceItem[]> => {
    return api.get('/workshop-services/me');
  },

  updateMyWorkshopServices: async (
    serviceTypes: string[],
  ): Promise<WorkshopServiceItem[]> => {
    return api.put('/workshop-services/me', { service_types: serviceTypes });
  },
};
