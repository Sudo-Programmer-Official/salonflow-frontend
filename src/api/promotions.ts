import { apiUrl, buildHeaders } from './client';

export type PromotionStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'ACTIVE' | 'EXPIRED' | 'DISABLED';

export type Promotion = {
  id: string;
  name: string;
  audience: string[];
  offerType: 'percent' | 'amount';
  offerValue: number;
  message: string;
  startAt: string;
  endAt: string;
  oneTimeUse: boolean;
  status: PromotionStatus;
  sentCount: number;
  redeemedCount: number;
};

export async function fetchPromotions(status?: 'active' | 'expired'): Promise<Promotion[]> {
  const params = status ? `?status=${status.toUpperCase()}` : '';
  const res = await fetch(`${apiUrl('/promotions')}${params}`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load promotions');
  }
  return res.json();
}

export async function createPromotion(payload: {
  name: string;
  offerType: 'percent' | 'amount';
  offerValue: number;
  audience: string[];
  message: string;
  startAt: string;
  endAt: string;
  oneTimeUse?: boolean;
}): Promise<Promotion> {
  const res = await fetch(apiUrl('/promotions'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const code = err.code || 'UNKNOWN_ERROR';
    const message = err.message || 'Failed to create promotion';
    const error = new Error(message) as any;
    error.code = code;
    throw error;
  }
  return res.json();
}

export async function sendPromotion(id: string): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/promotions/${id}/send`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || 'Failed to send promotion') as any;
    error.code = err.code;
    throw error;
  }
  return res.json();
}

export async function testPromotion(id: string, phone: string): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/promotions/${id}/test`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || 'Failed to send test') as any;
    error.code = err.code;
    throw error;
  }
  return res.json();
}

export async function testPromotionMessage(phone: string, message: string): Promise<{ ok: true }> {
  const res = await fetch(apiUrl('/promotions/test-sms'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || 'Failed to send test') as any;
    error.code = err.code;
    throw error;
  }
  return res.json();
}

export async function testPromotionEmail(email: string, subject: string, message: string): Promise<{ ok: true }> {
  const res = await fetch(apiUrl('/promotions/test-email'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ email, subject, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || 'Failed to send test email') as any;
    error.code = err.code;
    throw error;
  }
  return res.json();
}

export async function fetchPromotionStats(id: string): Promise<{
  total: number;
  pending: number;
  sent: number;
  failed: number;
  blocked_cap?: number;
  canceled?: number;
  simulated: number;
  redeemed: number;
  status: string;
  last_updated_at?: string;
  next_poll_ms?: number | null;
  excluded_no_consent?: number;
  excluded_no_phone?: number;
}> {
  const res = await fetch(apiUrl(`/promotions/${id}/stats`), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || 'Failed to load stats') as any;
    error.code = err.code;
    throw error;
  }
  return res.json();
}

export async function disablePromotion(id: string): Promise<{ ok: true }> {
  const res = await fetch(apiUrl(`/promotions/${id}/disable`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || 'Failed to disable promotion') as any;
    error.code = err.code;
    throw error;
  }
  return res.json();
}
