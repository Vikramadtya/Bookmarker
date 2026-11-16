/**
 * The seam for a payment provider (Stripe, Razorpay, Lemon Squeezy, ...).
 * Until one is configured, checkout answers 501 and everything else, including
 * access codes, works without it.
 *
 * A provider's webhook handler is expected to:
 *   1. verify the signature,
 *   2. update the user's Billing record (subscriptionStatus, subscriptionPeriodEnd, ids),
 *   3. call CouponsService.consumeDiscount(userId, code) when a payment used a discount code.
 */
export interface CheckoutRequest {
  userId: string;
  plan: 'monthly' | 'yearly';
  discountCode?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<{ url: string }>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
