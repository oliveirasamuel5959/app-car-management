import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

import { api } from './api';
import { serviceService } from './service-service';

describe('service-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a service order via PATCH /service-orders/:id/reject', async () => {
    await serviceService.rejectServiceOrder(5);
    expect(api.patch).toHaveBeenCalledWith('/service-orders/5/reject', {});
  });

  it('fetches the order breakdown via GET /service-orders/:id/breakdown', async () => {
    await serviceService.getServiceOrderBreakdown(5);
    expect(api.get).toHaveBeenCalledWith('/service-orders/5/breakdown');
  });

  it('sends parts and labor on completion', async () => {
    await serviceService.completeServiceOrder(5, {
      workshop_notes: 'Pronto',
      parts: [
        { description: 'Pastilha de freio', quantity: 2, unit_price: 50 },
      ],
      labor_description: 'Mão de obra',
      labor_cost: 80,
    });
    expect(api.patch).toHaveBeenCalledWith('/service-orders/5/complete', {
      workshop_notes: 'Pronto',
      parts: [{ description: 'Pastilha de freio', quantity: 2, unit_price: 50 }],
      labor_description: 'Mão de obra',
      labor_cost: 80,
    });
  });
});
