/**
 * Payment mode resolution: Stripe Elements when a publishable key is
 * configured, otherwise the local mock flow ("Simular pagamento").
 * Pure so it is unit-testable without rendering the dialog.
 */
export type PaymentMode = 'stripe' | 'mock';

export function resolvePaymentMode(publishableKey: string | undefined): PaymentMode {
  return publishableKey ? 'stripe' : 'mock';
}
