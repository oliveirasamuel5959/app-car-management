import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkshopRating {
  id: number;
  schedule_id: number | null;
  workshop_tenant_id: string;
  client_tenant_id: string;
  client_name: string | null;
  rating: number; // 0–5
  comment: string | null;
  created_at: string;
}

export interface WorkshopRatingCreate {
  schedule_id: number;
  rating: number; // 0–5
  comment?: string | null;
}

export interface WorkshopRatingUpdate {
  rating?: number | null;
  comment?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const workshopRatingService = {
  // -- Public reads --------------------------------------------------------

  listForWorkshop: async (workshopId: number, skip = 0, limit = 50): Promise<WorkshopRating[]> => {
    const qs = buildQuery({ workshop_id: workshopId, skip, limit });
    return api.get(`/workshop-ratings/${qs}`);
  },

  // -- Client reads --------------------------------------------------------

  listMine: async (skip = 0, limit = 50): Promise<WorkshopRating[]> => {
    const qs = buildQuery({ skip, limit });
    return api.get(`/workshop-ratings/mine${qs}`);
  },

  getById: async (ratingId: number): Promise<WorkshopRating> => {
    return api.get(`/workshop-ratings/${ratingId}`);
  },

  // -- Client writes -------------------------------------------------------

  create: async (data: WorkshopRatingCreate): Promise<WorkshopRating> => {
    return api.post('/workshop-ratings/', data);
  },

  update: async (ratingId: number, data: WorkshopRatingUpdate): Promise<WorkshopRating> => {
    return api.put(`/workshop-ratings/${ratingId}`, data);
  },

  remove: async (ratingId: number): Promise<void> => {
    return api.delete(`/workshop-ratings/${ratingId}`);
  },

  // -- Workshop reads ------------------------------------------------------

  listReceived: async (skip = 0, limit = 50): Promise<WorkshopRating[]> => {
    const qs = buildQuery({ skip, limit });
    return api.get(`/workshop-ratings/me${qs}`);
  },
};
