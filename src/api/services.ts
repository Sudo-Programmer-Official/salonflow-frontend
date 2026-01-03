import { apiUrl, buildHeaders } from './client';

export type ServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  points: number;
  isActive: boolean;
};

const apiBase = apiUrl('/services');

export async function fetchServices(): Promise<ServiceItem[]> {
  const res = await fetch(apiBase, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load services');
  }
  return res.json();
}

export async function createService(input: {
  name: string;
  durationMinutes: number;
  points?: number;
}): Promise<ServiceItem> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create service');
  }
  return res.json();
}

export async function updateServiceStatus(serviceId: string, isActive: boolean) {
  const res = await fetch(`${apiBase}/${serviceId}/status`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update status');
  }
  return res.json();
}
