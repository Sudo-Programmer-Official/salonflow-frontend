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

export async function fetchBillingStatus(): Promise<{
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  smsCredits?: SmsCredits;
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

export async function createSmsPackCheckout(pack: SmsPack) {
  const res = await fetch(`${apiBase}/sms-pack`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ pack }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start SMS pack checkout');
  }
  return res.json() as Promise<{ url: string | null }>;
}
