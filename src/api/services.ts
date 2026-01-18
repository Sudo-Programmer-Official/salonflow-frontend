import { apiUrl, buildHeaders } from '@/api/client';

export type ServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  points: number;
  isActive: boolean;
  icon: string;
  categoryId?: string | null;
  priceCents?: number;
  currency?: string;
  bookingRules?: Record<string, any>;
  staffCount?: number;
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
  icon?: string;
  categoryId?: string | null;
  priceCents?: number;
  currency?: string;
  bookingRules?: Record<string, any>;
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

export async function updateService(
  serviceId: string,
  input: {
    name?: string;
    durationMinutes?: number;
    points?: number;
    icon?: string;
    isActive?: boolean;
    categoryId?: string | null;
    priceCents?: number;
    currency?: string;
    bookingRules?: Record<string, any>;
  },
): Promise<ServiceItem> {
  const res = await fetch(`${apiBase}/${serviceId}`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update service');
  }
  return res.json();
}

export async function fetchServiceStaffCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${apiBase}/grouped`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load services');
  }
  const grouped = await res.json();
  const map: Record<string, number> = {};
  if (Array.isArray(grouped)) {
    grouped.forEach((cat: any) => {
      (cat.services ?? []).forEach((svc: any) => {
        if (svc?.id) {
          map[svc.id] = typeof svc.staffCount === 'number' ? svc.staffCount : 0;
        }
      });
    });
  }
  return map;
}
