export type ServiceOption = {
  id: string;
  name: string;
};

export type CreateCheckInPayload = {
  name: string;
  phoneE164: string;
  serviceId?: string | null;
};

const apiBase = '/api';

const resolveTenant = (tenant?: string | null) =>
  tenant ||
  (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search)).get('tenant') : null) ||
  (import.meta.env.VITE_TENANT_ID as string | undefined) ||
  (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? null : null) ||
  (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? null : null);

export async function fetchServices(tenant?: string): Promise<ServiceOption[]> {
  const tenantParam = resolveTenant(tenant);
  const url = tenantParam
    ? `${apiBase}/public/services?tenant=${encodeURIComponent(tenantParam)}`
    : `${apiBase}/public/services`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load services');
  }

  const data = await res.json();
  return (data as any[]).map((s) => ({ id: s.id, name: s.name }));
}

export async function createPublicCheckIn(payload: CreateCheckInPayload, tenant?: string) {
  const tenantParam = resolveTenant(tenant);
  const url = tenantParam
    ? `${apiBase}/checkins/public?tenant=${encodeURIComponent(tenantParam)}`
    : `${apiBase}/checkins/public`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to check in');
  }

  return res.json();
}
