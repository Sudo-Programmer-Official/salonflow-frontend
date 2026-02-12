import { apiUrl, buildHeaders } from '@/api/client';

export type QueueItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  services?: Array<{
    serviceId?: string | null;
    serviceName: string;
    priceCents?: number | null;
    durationMinutes?: number | null;
    position?: number | null;
    currency?: string | null;
  }> | null;
  staffName: string | null;
  appointmentId?: string | null;
  createdAt: string;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELED';
  amountPaid?: number | null;
  paidAt?: string | null;
  servedByName?: string | null;
  pointsBalance?: number | null;
  calledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  visitsLast30?: number;
  totalVisits?: number;
  customerType?: 'VIP' | 'SECOND_TIME' | 'REGULAR';
};

const apiBase = apiUrl('/checkins');

export type QueueResponse =
  | { locked: true }
  | { locked?: false; items: QueueItem[]; nextCursor?: string | null; hasMore?: boolean };

export async function fetchQueue(params?: {
  status?: 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW';
  limit?: number;
  cursor?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<QueueResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);

  const url = search.toString()
    ? `${apiBase}/queue?${search.toString()}`
    : `${apiBase}/queue`;

  const res = await fetch(url, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (res.status === 402) {
    return { locked: true };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load queue');
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return { items: data, nextCursor: null, hasMore: false };
  }
  return data;
}

export async function fetchQueueSummary(params?: {
  from?: string | null;
  to?: string | null;
}): Promise<{ waiting: number; inService: number; completed: number; noShow: number }> {
  const search = new URLSearchParams();
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const url = search.toString()
    ? `${apiBase}/queue/summary?${search.toString()}`
    : `${apiBase}/queue/summary`;

  const res = await fetch(url, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load queue summary');
  }
  return res.json();
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

export async function cancelCheckIn(checkInId: string) {
  const res = await fetch(`${apiBase}/${checkInId}/cancel`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel');
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
    giftCardNumber?: string | null;
    giftCardAmount?: number | null;
    giftCards?: Array<{ number: string; amount: number }>;
    payments?: Array<{ method: 'cash' | 'card' | 'gift'; amount: number }>;
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
