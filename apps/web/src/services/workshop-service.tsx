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
   * Fetch workshops near the given latitude/longitude coordinates.
   * The backend is expected to support query params `lat` & `lng`.
   */
  getNearby: async (lat: number, lng: number) => {
    try {
      const response = await api.get(`/workshops?lat=${lat}&lng=${lng}`);
      return response;
    } catch (error: any) {
      console.error('workshopService.getNearby error:', error);
      throw new Error(error.message || 'Failed to fetch workshops');
    }
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
};
