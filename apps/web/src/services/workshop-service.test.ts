import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

import { api } from './api';
import { workshopService } from './workshop-service';

describe('workshop-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the search query with filters, CSV service types, sort, and pagination', async () => {
    await workshopService.searchWorkshops({
      lat: 1.5,
      lng: -2.5,
      radiusKm: 25,
      minRating: 4,
      serviceTypes: ['manutencao', 'reparo'],
      sort: 'distance',
      skip: 10,
      limit: 5,
    });
    expect(api.get).toHaveBeenCalledWith(
      '/workshops/?lat=1.5&lng=-2.5&radius_km=25&min_rating=4&service_types=manutencao%2Creparo&sort=distance&skip=10&limit=5',
    );
  });

  it('omits empty filters from the search query', async () => {
    await workshopService.searchWorkshops({});
    expect(api.get).toHaveBeenCalledWith('/workshops/?skip=0&limit=50');
  });

  it('omits a null min rating and empty service type list', async () => {
    await workshopService.searchWorkshops({
      name: 'oficina',
      minRating: null,
      serviceTypes: [],
      sort: 'rating',
    });
    expect(api.get).toHaveBeenCalledWith(
      '/workshops/?name=oficina&sort=rating&skip=0&limit=50',
    );
  });

  it('lists and replaces my offered service types', async () => {
    await workshopService.getMyWorkshopServices();
    expect(api.get).toHaveBeenCalledWith('/workshop-services/me');

    await workshopService.updateMyWorkshopServices(['manutencao', 'inspecao']);
    expect(api.put).toHaveBeenCalledWith('/workshop-services/me', {
      service_types: ['manutencao', 'inspecao'],
    });
  });
});
