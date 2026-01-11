import { apiUrl, buildHeaders } from './client';

export type TenantOverview = {
  businessId: string;
  name: string;
  subdomain: string;
  status: string;
  createdAt: string;
};

export type TenantMetrics = {
  smsSentThisMonth: number;
  smsPackRevenueThisMonth: number;
  appointmentsThisMonth: number;
  checkinsThisMonth: number;
  revenueThisMonth: number;
  vipCount: number;
  avgLifetimePoints: number;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionCurrentPeriodEnd: string | null;
};

export type PlatformAverages = {
  avgSmsPerSalon: number;
};

export async function fetchTenants(): Promise<{ tenants: TenantOverview[]; averages: PlatformAverages }> {
  const res = await fetch(apiUrl('/superadmin/tenants'), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) throw new Error('Failed to load tenants');
  return res.json();
}

export async function fetchTenantDetail(
  businessId: string,
): Promise<{ tenant: TenantOverview; metrics: TenantMetrics }> {
  const res = await fetch(apiUrl(`/superadmin/tenants/${businessId}`), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) throw new Error('Failed to load tenant');
  return res.json();
}

export async function impersonateTenant(
  businessId: string,
): Promise<{
  token: string;
  role: string;
  businessId: string;
  email?: string | null;
  impersonated?: boolean;
  impersonatorUserId?: string;
  originalRole?: string;
}> {
  const res = await fetch(apiUrl(`/superadmin/tenants/${businessId}/impersonate`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to impersonate tenant');
  }
  return res.json();
}
