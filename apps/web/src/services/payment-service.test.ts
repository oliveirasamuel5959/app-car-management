import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from './api';
import { paymentService } from './payment-service';

describe('payment-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the checkout session for a service order', async () => {
    await paymentService.createCheckout(42);
    expect(api.post).toHaveBeenCalledWith('/payments/service-orders/42/checkout', {});
  });

  it('confirms a payment by id', async () => {
    await paymentService.confirmPayment(7);
    expect(api.post).toHaveBeenCalledWith('/payments/7/confirm', {});
  });

  it('fetches the payment state of an order', async () => {
    await paymentService.getPaymentForOrder(42);
    expect(api.get).toHaveBeenCalledWith('/payments/service-orders/42');
  });

  it('refunds a payment by id', async () => {
    await paymentService.refundPayment(7);
    expect(api.post).toHaveBeenCalledWith('/payments/7/refund', {});
  });
});
