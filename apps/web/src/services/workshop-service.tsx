import { api } from './api';

export const workshopService = {
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
};
