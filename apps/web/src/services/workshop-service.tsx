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
};
