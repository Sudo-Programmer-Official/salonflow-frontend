import { apiUrl, buildHeaders } from '@/api/client';

export type PaymentIntentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUNDED'
  | 'VOIDED';

export type PaymentIntent = {
  id: string;
  checkInId: string;
  requestedAmountCents: number;
  tipAmountCents: number;
  capturedAmountCents: number;
  currency: string;
  paymentChannel: 'IN_PERSON' | 'ONLINE' | 'CARD_ON_FILE' | 'GIFT_CARD' | 'CASH' | 'EXTERNAL';
  executionMode: 'manual' | 'native_device' | 'server_terminal';
  provider: string | null;
  status: PaymentIntentStatus;
  providerTransactionId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
};

export type IntegratedCheckoutContext = {
  reviewSmsConsent: boolean;
  staffId: string | null;
  staffName: string | null;
  source: 'admin_checkout' | 'pos';
  createdFrom: string | null;
  operatorId: string | null;
  locationId: string | null;
  servedByName: string | null;
  redeemPoints: boolean;
  promotionId: string | null;
};

const readResponse = async <T>(response: Response, fallback: string): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || fallback) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = body.code;
    throw error;
  }
  return body as T;
};

const paymentIntentUrl = (id: string) => apiUrl(`/payment-intents/${encodeURIComponent(id)}`);

export async function createServerTerminalPayment(input: {
  checkInId: string;
  idempotencyKey: string;
  tipAmountCents: number;
  checkoutContext: IntegratedCheckoutContext;
}) {
  const response = await fetch(apiUrl('/payment-intents'), {
    method: 'POST',
    headers: {
      ...buildHeaders({ auth: true, tenant: true, json: true }),
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      checkInId: input.checkInId,
      paymentChannel: 'IN_PERSON',
      executionMode: 'server_terminal',
      tipAmountCents: input.tipAmountCents,
      checkoutContext: input.checkoutContext,
    }),
  });
  return readResponse<{ intent: PaymentIntent; idempotent: boolean }>(response, 'Failed to create terminal payment');
}

export async function prepareServerTerminalPayment(paymentIntentId: string) {
  const response = await fetch(`${paymentIntentUrl(paymentIntentId)}/prepare`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return readResponse<{ paymentIntentId: string; paymentAttemptId: string; providerHandle: string }>(
    response,
    'Failed to send payment to the terminal',
  );
}

export async function fetchPaymentIntent(paymentIntentId: string) {
  const response = await fetch(paymentIntentUrl(paymentIntentId), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return readResponse<PaymentIntent>(response, 'Failed to load terminal payment status');
}

export async function reconcilePaymentIntent(paymentIntentId: string) {
  const response = await fetch(`${paymentIntentUrl(paymentIntentId)}/reconcile`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return readResponse<PaymentIntent>(response, 'Failed to reconcile terminal payment');
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  const response = await fetch(`${paymentIntentUrl(paymentIntentId)}/cancel`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return readResponse<PaymentIntent>(response, 'Failed to cancel terminal payment');
}
