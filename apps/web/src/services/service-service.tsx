import { api } from './api';

export const serviceService = {
  /**
   * Create a new service
   */
  createService: async (serviceData: {
    workshop_id: number;
    vehicle_id: number;
    name: string;
    description?: string;
    status?: string;
    progress_percentage?: number;
    checkin_date: string;
    estimated_finish_date?: string;
    estimated_hours?: number;
    estimated_cost?: number;
    workshop_notes?: string;
  }) => {
    try {
      const response = await api.post('/services', serviceData);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to create service');
    }
  },

  /**
   * Get all services with optional filters
   */
  getServices: async (filters?: { workshop_id?: number; vehicle_id?: number }) => {
    try {
      let url = '/services';
      const params = new URLSearchParams();
      
      if (filters?.workshop_id) {
        params.append('workshop_id', filters.workshop_id.toString());
      }
      if (filters?.vehicle_id) {
        params.append('vehicle_id', filters.vehicle_id.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch services');
    }
  },

  /**
   * Get service by ID
   */
  getServiceById: async (serviceId: number) => {
    try {
      const response = await api.get(`/services/${serviceId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch service');
    }
  },

  /**
   * Get services for a specific workshop
   */
  getWorkshopServices: async (workshopId: number) => {
    try {
      const response = await api.get(`/services?workshop_id=${workshopId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch workshop services');
    }
  },

  /**
   * Get services for a specific vehicle
   */
  getVehicleServices: async (vehicleId: number) => {
    try {
      const response = await api.get(`/services?vehicle_id=${vehicleId}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch vehicle services');
    }
  },

  getMyServices: async () => {
    try {
      const response = await api.get('/services/my');
      console.log('Fetched my services:', response);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch your services');
    }
  },

  updateService: async (
  serviceId: number,
  serviceData: {
    name?: string;
    description?: string;
    status?: string;
    workshop_notes?: string;
  }
  ) => {
    try {
      const response = await api.put(
        `/services/my/${serviceId}`,
        serviceData
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.detail || 'Failed to update service'
      );
    }
  },
};
