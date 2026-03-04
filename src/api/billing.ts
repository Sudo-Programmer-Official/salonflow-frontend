import { apiUrl, buildHeaders } from '@/api/client';

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | string
  | null;

const apiBase = apiUrl('/billing');

export type SmsCredits = {
  includedRemaining: number;
  purchasedRemaining: number;
  monthlyIncluded: number;
  monthlyUsage: number;
  totalAvailable: number;
};

export type SmsPack = 500 | 1500 | 4000;

export type SmsUsage = {
  sent: number;
  received: number;
  total: number;
  estimatedCost: number;
};

export type SmsPricing = {
  unitPrice: number;
};

export type SmsPackInfo = {
  size: number;
  price: number;
};

export type SmsLedgerEntry = {
  id?: string;
  createdAt: string;
  delta: number;
  reason: string;
  amountUsd: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
};

export async function fetchBillingStatus(): Promise<{
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  billing?: {
    status: string;
    plan: string | null;
    renewsAt: string | null;
    billingMode: string;
    isDemo: boolean;
    canSubscribe?: boolean;
    canStartCheckout?: boolean;
    checkoutInProgress?: boolean;
    checkoutBlockReason?: string | null;
    checkoutSessionUrl?: string | null;
    openInvoiceUrl?: string | null;
    subscriptionId?: string | null;
    customerId?: string | null;
    graceUntil?: string | null;
    inGrace?: boolean;
  };
  smsCredits?: SmsCredits;
  smsUsage?: SmsUsage;
  smsPricing?: SmsPricing;
  smsPacks?: SmsPackInfo[];
  smsLedger?: SmsLedgerEntry[];
}> {
  const res = await fetch(`${apiBase}/status`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load billing status');
  }
  return res.json();
}

export async function fetchSmsLedgerPage(params: {
  limit?: number;
  cursor?: string | null;
  direction?: 'forward' | 'backward';
}): Promise<{ items: SmsLedgerEntry[]; nextCursor: string | null; prevCursor: string | null }> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.direction) q.set('direction', params.direction);
  const res = await fetch(`${apiBase}/sms-ledger?${q.toString()}`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load SMS ledger');
  }
  return res.json();
}

export async function createCheckoutSession(plan: 'monthly' | 'annual') {
  const res = await fetch(`${apiBase}/checkout-session`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start checkout');
  }
  return res.json() as Promise<{ url: string | null }>;
}

export async function createPortalSession() {
  const res = await fetch(`${apiBase}/portal`, {
    method: 'GET',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to open portal');
  }
  return res.json() as Promise<{ url: string | null }>;
}

export async function fetchSmsCredits(): Promise<SmsCredits> {
  const res = await fetch(`${apiBase}/sms-credits`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load SMS credits');
  }
  return res.json();
}

export async function createSmsPackCheckout(pack: SmsPack, quantity: number) {
  const res = await fetch(`${apiBase}/sms-pack`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ pack, quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start SMS pack checkout');
  }
  return res.json() as Promise<{ url: string | null }>;
}

export async function confirmBilling(sessionId: string): Promise<{
  billing: {
    status: string;
    plan: string | null;
    renewsAt: string | null;
    billingMode: string;
    isDemo: boolean;
  };
}> {
  const res = await fetch(`${apiBase}/confirm`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ sessionId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to confirm billing');
  }
  return body;
}
