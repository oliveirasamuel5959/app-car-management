import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from './api';
import { workshopRatingService } from './workshop-rating-service';

describe('workshop-rating-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the public workshop list query', async () => {
    await workshopRatingService.listForWorkshop(7, 0, 20);
    expect(api.get).toHaveBeenCalledWith(
      '/workshop-ratings/?workshop_id=7&skip=0&limit=20',
    );
  });

  it('builds the mine and received endpoints', async () => {
    await workshopRatingService.listMine(5, 10);
    expect(api.get).toHaveBeenCalledWith('/workshop-ratings/mine?skip=5&limit=10');

    await workshopRatingService.listReceived();
    expect(api.get).toHaveBeenCalledWith('/workshop-ratings/me?skip=0&limit=50');
  });

  it('posts the create payload', async () => {
    await workshopRatingService.create({ schedule_id: 3, rating: 4, comment: 'ok' });
    expect(api.post).toHaveBeenCalledWith('/workshop-ratings/', {
      schedule_id: 3,
      rating: 4,
      comment: 'ok',
    });
  });

  it('puts updates and deletes by id', async () => {
    await workshopRatingService.update(9, { rating: 2 });
    expect(api.put).toHaveBeenCalledWith('/workshop-ratings/9', { rating: 2 });

    await workshopRatingService.remove(9);
    expect(api.delete).toHaveBeenCalledWith('/workshop-ratings/9');
  });
});
