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

export type DemoDeliveryResponse = {
  status: string;
  request: {
    id: string;
    status: string;
    demoTemplateKey: string | null;
    assignedBusinessId: string | null;
    assignedSubdomain: string | null;
    assignedUsername: string | null;
    assignedTempPassword: string | null;
    loginUrl: string | null;
    approvedAt: string | null;
    sentAt: string | null;
    activatedAt: string | null;
  };
  template: {
    key: string;
    label: string;
    summary: string;
  };
  loginUrl: string;
  username: string;
  tempPassword: string;
  emailStatus: { status: string; error?: string | null; errorCode?: string | null };
};

export async function sendDemoRequest(id: string, templateKey?: string | null): Promise<DemoDeliveryResponse> {
  const res = await fetch(apiUrl(`/platform/demo-requests/${id}/send`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ templateKey }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to send demo');
  }
  return body as DemoDeliveryResponse;
}
