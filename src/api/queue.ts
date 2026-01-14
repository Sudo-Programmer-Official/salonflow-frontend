import { apiUrl, buildHeaders } from '@/api/client';

export type QueueItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  staffName: string | null;
  createdAt: string;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELED';
  amountPaid?: number | null;
  paidAt?: string | null;
  servedByName?: string | null;
  pointsBalance?: number | null;
  calledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

const apiBase = apiUrl('/checkins');

export type QueueResponse =
  | { locked: true }
  | { locked?: false; items: QueueItem[] };

export async function fetchQueue(): Promise<QueueResponse> {
  const res = await fetch(`${apiBase}/queue`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (res.status === 402) {
    return { locked: true };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load queue');
  }

  return { items: await res.json() };
}

export async function callCheckIn(checkInId: string) {
  const res = await fetch(`${apiBase}/${checkInId}/call`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to call');
  }
  return res.json();
}

export async function assignToMe(checkInId: string) {
  const res = await fetch(`${apiBase}/${checkInId}/assign`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign');
  }

  return res.json();
}

export async function startCheckIn(checkInId: string) {
  const res = await fetch(`${apiBase}/${checkInId}/start`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start service');
  }

  return res.json();
}

export async function completeCheckIn(checkInId: string) {
  const res = await fetch(`${apiBase}/${checkInId}/complete`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete');
  }

  return res.json();
}

export async function markNoShow(checkInId: string) {
  const res = await fetch(`${apiBase}/${checkInId}/no-show`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to mark no-show');
  }
  return res.json();
}

export async function checkoutCheckIn(
  checkInId: string,
  payload: {
    amountPaid?: number | null;
    reviewSmsConsent: boolean;
    servedByName?: string | null;
    redeemPoints?: boolean;
  },
) {
  const res = await fetch(`${apiBase}/${checkInId}/checkout`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to checkout');
  }

  return res.json();
}
