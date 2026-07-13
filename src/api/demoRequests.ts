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
  converted_business_id?: string | null;
  demo_template_key?: string | null;
  assigned_business_id?: string | null;
  assigned_subdomain?: string | null;
  assigned_username?: string | null;
  assigned_temp_password?: string | null;
  login_url?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at?: string;
};

const apiBase = '/api/admin/demo-requests';

const adminKey =
  (import.meta.env.VITE_ADMIN_KEY as string | undefined) ||
  (typeof window !== 'undefined' ? localStorage.getItem('adminKey') ?? undefined : undefined);

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (adminKey) headers['x-admin-key'] = adminKey;
  return headers;
};

export async function fetchDemoRequests(): Promise<DemoRequest[]> {
  const res = await fetch(apiBase, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load demo requests');
  }
  return res.json();
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
  const res = await fetch(`${apiBase}/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to convert demo request');
  }

  return res.json();
}

export async function updateDemoRequestStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`${apiBase}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update status');
  }
}

export type MagicLinkResponse = {
  magicUrl: string;
  subdomain: string;
  ownerEmail: string;
};

export async function generateMagicLink(id: string): Promise<MagicLinkResponse> {
  const res = await fetch(`${apiBase}/${id}/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create magic link');
  }

  return res.json();
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
  const res = await fetch(`${apiBase}/${id}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ templateKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send demo');
  }

  return res.json();
}
