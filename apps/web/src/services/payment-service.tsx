import { api } from './api';

export type PaymentStatus = 'pending' | 'succeeded' | 'refunded' | 'failed';

export interface PaymentCheckout {
  payment_id: number;
  checkout_url: string;
  amount_cents: number;
}

export interface Payment {
  id: number;
  service_order_id: number;
  tenant_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  workshop_amount_cents: number;
  status: PaymentStatus;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRefund {
  payment_id: number;
  status: string;
}

export const paymentService = {
  /** Create (or reuse) the Stripe Checkout session for a completed service order. */
  createCheckout: async (serviceOrderId: number): Promise<PaymentCheckout> => {
    return api.post(`/payments/service-orders/${serviceOrderId}/checkout`, {});
  },

  /** Confirm a payment after the client paid the intent (idempotent). */
  confirmPayment: async (paymentId: number): Promise<Payment> => {
    return api.post(`/payments/${paymentId}/confirm`, {});
  },

  /** Get the payment state of a service order (role-aware). */
  getPaymentForOrder: async (serviceOrderId: number): Promise<Payment> => {
    return api.get(`/payments/service-orders/${serviceOrderId}`);
  },

  /** Refund a succeeded payment (workshop only, full amount). */
  refundPayment: async (paymentId: number): Promise<PaymentRefund> => {
    return api.post(`/payments/${paymentId}/refund`, {});
  },
};
