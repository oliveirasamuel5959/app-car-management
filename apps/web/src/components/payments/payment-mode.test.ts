import { describe, expect, it } from 'vitest';

import { resolvePaymentMode } from './payment-mode';

describe('payment-mode', () => {
  it('uses the mock mode when no publishable key is configured', () => {
    expect(resolvePaymentMode(undefined)).toBe('mock');
    expect(resolvePaymentMode('')).toBe('mock');
  });

  it('uses Stripe mode when a publishable key is configured', () => {
    expect(resolvePaymentMode('pk_test_1234567890')).toBe('stripe');
  });
});
