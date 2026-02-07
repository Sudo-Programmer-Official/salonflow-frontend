import { apiUrl, buildHeaders } from './client';

export type TenantControl = {
  business_id: string;
  status: 'active' | 'disabled' | 'maintenance';
  maintenance_message: string | null;
  disabled_reason: string | null;
  session_version: number;
  sms_blocked: boolean;
  email_blocked: boolean;
  allow_promotions: boolean;
  allow_transactional_only: boolean;
  is_demo: boolean;
  demo_expires_at: string | null;
  sms_daily_cap: number | null;
  email_daily_cap: number | null;
  frozen: boolean;
  last_reset_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformAuditRow = {
  id: string;
  business_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  reason: string;
  before: any;
  after: any;
  created_at: string;
};

export async function fetchTenantControl(businessId: string): Promise<{ tenant: { id: string; name: string }; control: TenantControl }> {
  const res = await fetch(apiUrl(`/platform/tenants/${businessId}/control`), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  if (!res.ok) throw new Error('Failed to load controls');
  return res.json();
}

export async function updateTenantControl(businessId: string, payload: Partial<TenantControl> & { reason?: string }) {
  const res = await fetch(apiUrl(`/platform/tenants/${businessId}/control`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to update controls');
  return body.control as TenantControl;
}

export async function forceLogoutTenant(businessId: string, reason: string) {
  const res = await fetch(apiUrl(`/platform/tenants/${businessId}/force-logout`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ reason }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to force logout');
  return body.sessionVersion as number;
}

export async function resetTenantUsage(businessId: string, reason: string) {
  const res = await fetch(apiUrl(`/platform/tenants/${businessId}/reset-usage`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ reason }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to reset usage');
  return body;
}

export async function grantTenantSmsCredits(businessId: string, amount: number, reason: string) {
  const res = await fetch(apiUrl(`/platform/tenants/${businessId}/grant-sms-credits`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ amount, reason }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to grant SMS credits');
  return body.balance;
}

export async function fetchTenantAudit(businessId: string, limit = 50): Promise<PlatformAuditRow[]> {
  const res = await fetch(apiUrl(`/platform/tenants/${businessId}/audit?limit=${limit}`), {
    headers: buildHeaders({ auth: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to load audit log');
  return body.audit as PlatformAuditRow[];
}
