import { apiUrl, buildHeaders } from './client';

export type ServiceOption = {
  id: string;
  name: string;
  icon?: string;
  durationMinutes?: number;
  priceCents?: number;
  currency?: string;
};

export type CreateCheckInPayload = {
  name: string;
  phoneE164: string;
  serviceId?: string | null;
  serviceName?: string | null;
  appointmentId?: string | null;
};

export async function publicLookup(phoneE164: string): Promise<
  | { exists: false }
  | { exists: true; customer: { id: string; name: string; pointsBalance: number | null } }
> {
  const res = await fetch(apiUrl('/checkins/public/lookup'), {
    method: 'POST',
    headers: buildHeaders({ json: true, tenant: true }),
    body: JSON.stringify({ phoneE164 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Lookup failed');
  }
  return res.json();
}

export async function fetchServices(): Promise<ServiceOption[]> {
  const res = await fetch(apiUrl('/public/services'), {
    headers: buildHeaders({ json: true, tenant: true }),
  });

  if (!res.ok) {
    throw new Error('Failed to load services');
  }

  const data = await res.json();
  return (data as any[]).map((s) => ({ id: s.id, name: s.name }));
}

export async function fetchGroupedServices(): Promise<
  Array<{
    categoryId: string | null;
    categoryName: string;
    categoryIcon: string;
    services: Array<{
      id: string;
      name: string;
      icon?: string;
      durationMinutes?: number;
      priceCents?: number;
      currency?: string;
    }>;
  }>
> {
  const res = await fetch(apiUrl('/public/services-grouped'), {
    headers: buildHeaders({ json: true, tenant: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load services');
  }
  return res.json();
}

export async function createPublicCheckIn(payload: CreateCheckInPayload) {
  const res = await fetch(apiUrl('/checkins/public'), {
    method: 'POST',
    headers: buildHeaders({ json: true, tenant: true }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to check in');
  }

  return res.json();
}
