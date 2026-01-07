export type DemoRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  converted_business_id?: string | null;
  created_at: string;
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
