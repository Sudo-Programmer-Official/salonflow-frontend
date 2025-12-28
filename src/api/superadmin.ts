const apiBase = '/api/superadmin';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
  const res = await fetch(`${apiBase}/tenants`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load tenants');
  return res.json();
}

export async function fetchTenantDetail(
  businessId: string,
): Promise<{ tenant: TenantOverview; metrics: TenantMetrics }> {
  const res = await fetch(`${apiBase}/tenants/${businessId}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load tenant');
  return res.json();
}
