import { apiUrl, buildHeaders } from './client';

export type ServiceOption = {
  id: string;
  name: string;
};

export type CreateCheckInPayload = {
  name: string;
  phoneE164: string;
  serviceId?: string | null;
  serviceName?: string | null;
};

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
