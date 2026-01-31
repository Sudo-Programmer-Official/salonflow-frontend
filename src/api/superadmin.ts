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
  billingStatus: string | null;
  billingGraceUntil: string | null;
  billingNotes: string | null;
};

export type PlatformAverages = {
  avgSmsPerSalon: number;
};

export type CreateTenantPayload = {
  name: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  tempPassword?: string;
};

export async function createTenant(payload: CreateTenantPayload): Promise<{
  businessId: string;
  ownerEmail: string;
  tempPassword: string;
}> {
  const res = await fetch(apiUrl('/superadmin/tenants'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to create tenant');
  }
  return body;
}

export async function resetOwnerPassword(
  businessId: string,
  email: string,
  newPassword?: string,
): Promise<{ tempPassword: string }> {
  const res = await fetch(apiUrl(`/superadmin/tenants/${businessId}/reset-owner-password`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ email, newPassword }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to reset password');
  }
  return body;
}

export async function seedDemo(businessId: string): Promise<{ seeded: boolean }> {
  const res = await fetch(apiUrl(`/superadmin/tenants/${businessId}/seed-demo`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to seed demo data');
  }
  return body;
}

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

export type UpdateBillingPayload = {
  status?: 'trial' | 'active' | 'grace' | 'paused' | 'cancelled';
  graceUntil?: string | null;
  notes?: string | null;
};

export async function updateTenantBilling(
  businessId: string,
  payload: UpdateBillingPayload,
): Promise<{
  billingStatus: string | null;
  billingGraceUntil: string | null;
  billingNotes: string | null;
}> {
  const res = await fetch(apiUrl(`/superadmin/tenants/${businessId}/billing`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update billing');
  }
  return body;
}
