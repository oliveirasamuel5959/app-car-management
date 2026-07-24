import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleStatus = 'pendente' | 'visualizado' | 'aceito' | 'recusado';
export type ServiceRequestType = 'manutencao' | 'reparo' | 'inspecao' | 'outro';

export interface Schedule {
  id: number;
  client_tenant_id: string;
  workshop_tenant_id: string;
  workshop_id: number;
  vehicle_id: number | null;
  service_request_type: ServiceRequestType;
  problem_description: string;
  contact_phone: string;
  contact_email: string;
  client_name: string | null;
  scheduled_at: string;
  status: ScheduleStatus;
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ScheduleCreate {
  workshop_id: number;
  vehicle_id?: number | null;
  service_request_type: ServiceRequestType;
  problem_description: string;
  contact_phone: string;
  contact_email: string;
  scheduled_at: string; // ISO 8601 datetime
}

export interface AgendaSlot {
  time: string; // "HH:MM"
  busy: boolean;
}

export interface AgendaDay {
  date: string; // "YYYY-MM-DD"
  day_of_week: number;
  is_open: boolean;
  slots: AgendaSlot[];
}

export interface WorkshopAgenda {
  days: AgendaDay[];
}

export interface WorkshopSearchParams {
  name?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  skip?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const scheduleService = {
  // -- Workshop view -------------------------------------------------------

  listForWorkshop: async (skip = 0, limit = 50): Promise<Schedule[]> => {
    const qs = buildQuery({ workshop_tenant_id: 'me', skip, limit });
    return api.get(`/schedules/${qs}`);
  },

  // -- Client view ---------------------------------------------------------

  listForClient: async (skip = 0, limit = 50): Promise<Schedule[]> => {
    const qs = buildQuery({ client_tenant_id: 'me', skip, limit });
    return api.get(`/schedules/${qs}`);
  },

  getById: async (scheduleId: number): Promise<Schedule> => {
    return api.get(`/schedules/${scheduleId}`);
  },

  // -- Client actions ------------------------------------------------------

  create: async (data: ScheduleCreate): Promise<Schedule> => {
    return api.post('/schedules/', data);
  },

  // -- Workshop actions ----------------------------------------------------

  view: async (scheduleId: number): Promise<Schedule> => {
    return api.patch(`/schedules/${scheduleId}/view`, {});
  },

  accept: async (scheduleId: number): Promise<Schedule> => {
    return api.patch(`/schedules/${scheduleId}/accept`, {});
  },

  reject: async (scheduleId: number): Promise<Schedule> => {
    return api.patch(`/schedules/${scheduleId}/reject`, {});
  },

  // -- Agenda --------------------------------------------------------------

  getAgenda: async (
    workshopId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<WorkshopAgenda> => {
    const qs = buildQuery({ date_from: dateFrom, date_to: dateTo });
    return api.get(`/workshops/${workshopId}/agenda/${qs}`);
  },

  // -- Workshop search -----------------------------------------------------

  searchWorkshops: async (params: WorkshopSearchParams): Promise<WorkshopSummary[]> => {
    const qs = buildQuery({
      name: params.name,
      lat: params.lat,
      lng: params.lng,
      radius_km: params.radius_km,
      skip: params.skip,
      limit: params.limit,
    });
    return api.get(`/workshops/${qs}`);
  },
};

export interface WorkshopSummary {
  id: number;
  tenant_id: string;
  name: string;
  email: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  rating_avg: number;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  opening_hours: string | null;
  logo_url: string | null;
  opening_time: string | null;
  closing_time: string | null;
  work_days: string | null;
  employee_count: number | null;
  user_id: number;
}
