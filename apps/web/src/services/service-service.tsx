import { api } from './api';
import type { ServiceHistoryType } from './service-history-service';

export interface ServiceOrder {
  id: number;
  tenant_id: string;
  workshop_id: number;
  workshop_client_id?: number | null;
  vehicle_id?: number | null;
  name: string;
  description?: string | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
  checkin_date: string;
  estimated_finish_date?: string | null;
  finished_at?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  estimated_cost?: number | null;
  final_cost?: number | null;
  workshop_notes?: string | null;
}

export interface ServiceOrderSummary {
  total_orders: number;
  active_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  recent_orders: ServiceOrder[];
}

export const serviceService = {
  /**
   * Create a new service order
   */
  createService: async (serviceData: {
    workshop_client_id?: number;
    vehicle_id?: number;
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
    return api.post('/service-orders', serviceData);
  },

  /**
   * Get all services with optional filters
   */
  getServices: async (filters?: { workshop_id?: number; vehicle_id?: number; workshop_client_id?: number }) => {
    let url = '/service-orders';
    const params = new URLSearchParams();

    if (filters?.workshop_id) {
      params.append('workshop_id', filters.workshop_id.toString());
    }
    if (filters?.vehicle_id) {
      params.append('vehicle_id', filters.vehicle_id.toString());
    }
    if (filters?.workshop_client_id) {
      params.append('workshop_client_id', filters.workshop_client_id.toString());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return api.get(url);
  },

  /**
   * Get service by ID
   */
  getServiceById: async (serviceId: number) => {
    return api.get(`/service-orders/${serviceId}`);
  },

  /**
   * Get services for a specific workshop
   */
  getWorkshopServices: async (workshopId: number) => {
    return api.get(`/service-orders?workshop_id=${workshopId}`);
  },

  /**
   * Get services for a specific vehicle
   */
  getVehicleServices: async (vehicleId: number) => {
    return api.get(`/service-orders?vehicle_id=${vehicleId}`);
  },

  getMyServices: async () => {
    return api.get('/service-orders');
  },

  getClientSummary: async () => {
    return api.get('/service-orders/summary');
  },

  acceptServiceOrder: async (serviceId: number) => {
    return api.patch(`/service-orders/${serviceId}/accept`, {});
  },

  startServiceOrder: async (serviceId: number, data?: { workshop_notes?: string; estimated_cost?: number }) => {
    return api.patch(`/service-orders/${serviceId}/start`, data ?? {});
  },

  completeServiceOrder: async (
    serviceId: number,
    data?: {
      workshop_notes?: string;
      final_cost?: number;
      service_type?: ServiceHistoryType;
      current_mileage?: number;
      labor_cost?: number;
      parts_cost?: number;
      invoice_number?: string;
      warranty_until_date?: string;
      warranty_mileage?: number;
    },
  ) => {
    return api.patch(`/service-orders/${serviceId}/complete`, data ?? {});
  },

  cancelServiceOrder: async (serviceId: number, data?: { workshop_notes?: string }) => {
    return api.patch(`/service-orders/${serviceId}/cancel`, data ?? {});
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
    return api.put(`/services/my/${serviceId}`, serviceData);
  },
};
