import { apiUrl, buildHeaders, readJsonResponse } from '@/api/client';

export type QueueItem = {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  services?: Array<{
    id?: string;
    serviceId?: string | null;
    serviceName: string;
    priceCents?: number | null;
    durationMinutes?: number | null;
    position?: number | null;
    staffId?: string | null;
    staffName?: string | null;
    requestedServiceId?: string | null;
    currency?: string | null;
  }> | null;
  requestedServices?: Array<{
    id: string;
    serviceId?: string | null;
    serviceName: string;
    position?: number | null;
    status: 'REQUESTED' | 'FULFILLED' | 'DISMISSED';
    requestedAt?: string;
    fulfilledAt?: string | null;
    fulfilledBy?: string | null;
    dismissedAt?: string | null;
    dismissedBy?: string | null;
    fulfilledServiceLineId?: string | null;
  }> | null;
  staffName: string | null;
  preferredStaffId?: string | null;
  visitStaff?: Array<{
    staffId: string;
    staffName?: string | null;
    position?: number | null;
  }> | null;
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

  const data = await readJsonResponse(res, { items: [], nextCursor: null, hasMore: false });
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
  return readJsonResponse(res, { waiting: 0, inService: 0, completed: 0, noShow: 0 });
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
  return readJsonResponse(res, null);
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

  return readJsonResponse(res, null);
}

export async function assignStaffToCheckIn(
  checkInId: string,
  staffId: string,
  serviceLineId?: string | null,
  overwriteExisting = false,
) {
  const res = await fetch(`${apiBase}/${checkInId}/assign`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({
      staffId,
      ...(serviceLineId ? { serviceLineId } : {}),
      ...(overwriteExisting ? { overwriteExisting: true } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign staff');
  }

  return readJsonResponse(res, null);
}

export async function unassignStaffFromCheckIn(
  checkInId: string,
  serviceLineId?: string | null,
) {
  const res = await fetch(`${apiBase}/${checkInId}/unassign`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(serviceLineId ? { serviceLineId } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to unassign staff');
  }

  return readJsonResponse(res, null);
}

export async function setVisitStaffForCheckIn(
  checkInId: string,
  staffIds: string[],
) {
  const res = await fetch(`${apiBase}/${checkInId}/visit-staff`, {
    method: 'PUT',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ staffIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save visit staff');
  }

  return readJsonResponse(res, null);
}

export async function addServiceToCheckIn(
  checkInId: string,
  serviceId: string,
  staffId?: string | null,
) {
  const res = await fetch(`${apiBase}/${checkInId}/services`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ serviceId, staffId: staffId ?? null }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add service');
  }

  return readJsonResponse(res, null);
}

async function mutateRequestedService(
  checkInId: string,
  requestedServiceId: string,
  action: 'fulfill' | 'dismiss' | 'restore',
) {
  const res = await fetch(
    `${apiBase}/${checkInId}/requested-services/${requestedServiceId}/${action}`,
    {
      method: 'POST',
      headers: buildHeaders({ auth: true, tenant: true, json: true }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to ${action} requested service`);
  }
  return readJsonResponse(res, null);
}

export const fulfillRequestedService = (checkInId: string, requestedServiceId: string) =>
  mutateRequestedService(checkInId, requestedServiceId, 'fulfill');

export const dismissRequestedService = (checkInId: string, requestedServiceId: string) =>
  mutateRequestedService(checkInId, requestedServiceId, 'dismiss');

export const restoreRequestedService = (checkInId: string, requestedServiceId: string) =>
  mutateRequestedService(checkInId, requestedServiceId, 'restore');

export async function removeServiceFromCheckIn(
  checkInId: string,
  serviceLineId: string,
) {
  const res = await fetch(`${apiBase}/${checkInId}/services/${serviceLineId}`, {
    method: 'DELETE',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove service');
  }

  return readJsonResponse(res, null);
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

  return readJsonResponse(res, null);
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

  return readJsonResponse(res, null);
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
  return readJsonResponse(res, null);
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
  return readJsonResponse(res, null);
}

export async function checkoutCheckIn(
  checkInId: string,
  payload: {
    amountPaid?: number | null;
    taxAmount?: number | null;
    tipAmount?: number | null;
    staffId?: string | null;
    staffName?: string | null;
    source?: 'admin_checkout' | 'pos';
    createdFrom?: string | null;
    operatorId?: string | null;
    locationId?: string | null;
    reviewSmsConsent: boolean;
    servedByName?: string | null;
    redeemPoints?: boolean;
    giftCardNumber?: string | null;
    giftCardAmount?: number | null;
    giftCards?: Array<{ number: string; amount: number }>;
    payments?: Array<{ method: 'cash' | 'card' | 'gift' | 'gift_card' | 'check' | 'other'; amount: number }>;
    paymentBreakdown?: Record<string, number>;
    promotionId?: string | null;
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

  return readJsonResponse(res, null);
}
