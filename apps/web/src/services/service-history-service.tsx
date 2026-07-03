import { api } from './api';

export type ServiceHistoryType =
  | 'oil_change'
  | 'tire_rotation'
  | 'tire_replacement'
  | 'brake_service'
  | 'battery_replacement'
  | 'air_filter'
  | 'transmission_service'
  | 'coolant_flush'
  | 'belt_replacement'
  | 'inspection'
  | 'other';

export interface ServiceHistory {
  id: number;
  tenant_id: string;
  vehicle_id: number;
  workshop_id?: number | null;
  status: string;
  service_type: ServiceHistoryType;
  description?: string | null;
  current_mileage?: number | null;
  next_service_mileage?: number | null;
  labor_cost?: number | null;
  parts_cost?: number | null;
  invoice_number?: string | null;
  warranty_until_date?: string | null;
  warranty_mileage?: number | null;
  serviced_at: string;
  next_service_date?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ServiceHistoryCreate {
  vehicle_id: number;
  service_type: ServiceHistoryType;
  description?: string | null;
  current_mileage?: number | null;
  labor_cost?: number | null;
  parts_cost?: number | null;
  invoice_number?: string | null;
  warranty_until_date?: string | null;
  warranty_mileage?: number | null;
  serviced_at: string;
}

export type ServiceHistoryUpdate = Partial<ServiceHistoryCreate>;

export const serviceHistoryService = {
  /**
   * List the current client's service-history records, optionally filtered.
   */
  list: async (filters?: { service_type?: string; vehicle_id?: number }): Promise<ServiceHistory[]> => {
    const params = new URLSearchParams();
    if (filters?.service_type) {
      params.append('service_type', filters.service_type);
    }
    if (filters?.vehicle_id) {
      params.append('vehicle_id', filters.vehicle_id.toString());
    }

    const query = params.toString();
    const response = await api.get(`/services-history/${query ? `?${query}` : ''}`);
    return Array.isArray(response) ? response : [];
  },

  /**
   * Get a single service-history record by ID.
   */
  getById: async (historyId: number): Promise<ServiceHistory> => {
    return api.get(`/services-history/${historyId}`);
  },

  /**
   * Create a new service-history record.
   */
  create: async (data: ServiceHistoryCreate): Promise<ServiceHistory> => {
    return api.post('/services-history/', data);
  },

  /**
   * Update an existing service-history record.
   */
  update: async (historyId: number, data: ServiceHistoryUpdate): Promise<ServiceHistory> => {
    return api.put(`/services-history/${historyId}`, data);
  },

  /**
   * Delete a service-history record.
   */
  delete: async (historyId: number): Promise<void> => {
    await api.delete(`/services-history/${historyId}`);
  },
};

export const workshopServiceHistoryService = {
  /**
   * List service-history records authored by the authenticated workshop
   * (i.e. created automatically when a service order was completed).
   */
  list: async (filters?: { service_type?: string; vehicle_id?: number }): Promise<ServiceHistory[]> => {
    const params = new URLSearchParams();
    if (filters?.service_type) {
      params.append('service_type', filters.service_type);
    }
    if (filters?.vehicle_id) {
      params.append('vehicle_id', filters.vehicle_id.toString());
    }

    const query = params.toString();
    const response = await api.get(`/services-history/workshop${query ? `?${query}` : ''}`);
    return Array.isArray(response) ? response : [];
  },
};

export const SERVICE_TYPE_OPTIONS: { value: ServiceHistoryType; label: string }[] = [
  { value: 'oil_change', label: 'Troca de Óleo' },
  { value: 'tire_rotation', label: 'Rodízio de Pneus' },
  { value: 'tire_replacement', label: 'Troca de Pneus' },
  { value: 'brake_service', label: 'Freios' },
  { value: 'battery_replacement', label: 'Troca de Bateria' },
  { value: 'air_filter', label: 'Filtro de Ar' },
  { value: 'transmission_service', label: 'Transmissão' },
  { value: 'coolant_flush', label: 'Troca de Fluido de Arrefecimento' },
  { value: 'belt_replacement', label: 'Troca de Correia' },
  { value: 'inspection', label: 'Inspeção' },
  { value: 'other', label: 'Outro' },
];

export const SERVICE_TYPE_LABELS: Record<ServiceHistoryType, string> = SERVICE_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<ServiceHistoryType, string>,
);

export const formatServiceHistoryDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

export const formatServiceHistoryCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatServiceHistoryMileage = (value?: number | null) => {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('pt-BR')} km`;
};
