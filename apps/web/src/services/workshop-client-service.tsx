import { api } from './api';

export interface WorkshopClient {
  id: number;
  workshop_id: number;
  name: string;
  email?: string;
  phone?: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_plate: string;
  user_id?: number;
  created_at: string;
}

export interface WorkshopClientCreate {
  name: string;
  email?: string;
  phone?: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_plate: string;
}

export const workshopClientService = {
  getClients: async (): Promise<WorkshopClient[]> => {
    const response = await api.get('/workshop-clients');
    return response;
  },

  getClientById: async (clientId: number): Promise<WorkshopClient> => {
    const response = await api.get(`/workshop-clients/${clientId}`);
    return response;
  },

  createClient: async (data: WorkshopClientCreate): Promise<WorkshopClient> => {
    const response = await api.post('/workshop-clients', data);
    return response;
  },

  updateClient: async (clientId: number, data: Partial<WorkshopClientCreate>): Promise<WorkshopClient> => {
    const response = await api.put(`/workshop-clients/${clientId}`, data);
    return response;
  },

  deleteClient: async (clientId: number): Promise<void> => {
    await api.delete(`/workshop-clients/${clientId}`);
  },
};
