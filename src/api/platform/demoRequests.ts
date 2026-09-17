import { apiUrl, buildHeaders } from '@/api/client';

export type DemoRequest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  source?: string | null;
  details?: Record<string, any> | null;
  isDraft?: boolean;
  progressStep?: number | null;
  createdAt: string;
  updatedAt?: string;
  userAgent?: string | null;
  referer?: string | null;
  convertedBusinessId?: string | null;
  demoTemplateKey?: string | null;
  assignedBusinessId?: string | null;
  assignedSubdomain?: string | null;
  assignedUsername?: string | null;
  assignedTempPassword?: string | null;
  loginUrl?: string | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  activatedAt?: string | null;
  demoAccess?: DemoAccessSummary | null;
};

export type DemoAccessSummary = {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  businessId: string;
  templateKey: string;
  subdomain: string;
  expiresAt: string;
  revokedAt: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
};

export type DemoAccessEvent = {
  id: string;
  event_type: string;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
};

export type DemoRequestPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DemoRequestPage = {
  requests: DemoRequest[];
  pagination: DemoRequestPagination;
};

export async function fetchDemoRequests(params?: { page?: number; pageSize?: number }): Promise<DemoRequestPage> {
  const search = new URLSearchParams();
  if (typeof params?.page === 'number') search.set('page', String(params.page));
  if (typeof params?.pageSize === 'number') search.set('pageSize', String(params.pageSize));
  const res = await fetch(apiUrl(`/platform/demo-requests${search.toString() ? `?${search.toString()}` : ''}`), {
    headers: buildHeaders({ auth: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load demo requests');
  }
  return res.json();
}

export async function updateDemoRequestStatus(id: string, status: string): Promise<void> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/status`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update status');
  }
}

export type DemoRequestConversion = {
  businessId: string;
  ownerUserId: string;
  ownerEmail: string;
  subdomain: string;
  trialEndsAt: string | null;
  password?: string;
};

export async function convertDemoRequest(id: string): Promise<DemoRequestConversion> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/convert`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to convert demo request');
  }
  return body as DemoRequestConversion;
}

export type MagicLinkResponse = {
  magicUrl: string;
  subdomain: string;
  ownerEmail: string;
};

export async function generateMagicLink(id: string): Promise<MagicLinkResponse> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/magic-link`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to create magic link');
  }
  return body as MagicLinkResponse;
}

export async function sendDemoRequest(id: string, templateKey?: string | null): Promise<DemoAccessIssueResponse> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/send`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(templateKey ? { templateKey } : {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to send demo');
  }
  return body as DemoAccessIssueResponse;
}

export type DemoAccessIssueResponse = {
  accessId: string;
  templateKey: string;
  accessUrl: string;
  demoUrl: string;
  expiresAt: string;
  lifecycleStatus: 'APPROVED' | 'SENT';
  emailStatus: { status: string; error?: string };
  smsStatus: { status: string; error?: string };
  summary: DemoAccessSummary;
};

export async function issueDemoAccess(id: string, templateKey?: string | null): Promise<DemoAccessIssueResponse> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/access`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(templateKey ? { templateKey } : {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to issue demo access');
  return body as DemoAccessIssueResponse;
}

export async function revokeDemoAccess(id: string): Promise<{ revoked: boolean }> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/access/revoke`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to revoke demo access');
  return body as { revoked: boolean };
}

export async function fetchDemoAccessEvents(id: string): Promise<{ events: DemoAccessEvent[] }> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/access/events`), {
    headers: buildHeaders({ auth: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to load demo access events');
  return body as { events: DemoAccessEvent[] };
}
