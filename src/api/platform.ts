import { apiUrl, buildHeaders } from './client';

export type PlatformTenantRow = {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  created_at?: string;
  sms_cap: number;
  email_cap: number;
  sms_sent: number;
  sms_blocked_cap: number;
  email_sent: number;
  email_blocked_cap: number;
};

export async function fetchPlatformTenants(): Promise<PlatformTenantRow[]> {
  const res = await fetch(apiUrl('/platform/tenants'), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) throw new Error('Failed to load tenants');
  return res.json();
}

export async function fetchPlatformLimits(tenantId: string) {
  const res = await fetch(apiUrl(`/platform/tenants/${tenantId}/limits`), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) throw new Error('Failed to load limits');
  return res.json();
}

export async function updatePlatformLimits(tenantId: string, payload: any) {
  const res = await fetch(apiUrl(`/platform/tenants/${tenantId}/limits`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update limits');
  }
  return res.json();
}

export async function fetchPlatformUsageOverview(month?: number) {
  const qs = month ? `?month=${month}` : '';
  const res = await fetch(apiUrl(`/platform/usage/overview${qs}`), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) throw new Error('Failed to load overview');
  return res.json();
}
