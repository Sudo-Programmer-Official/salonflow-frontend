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
};

export async function fetchDemoRequests(): Promise<DemoRequest[]> {
  const res = await fetch(apiUrl('/platform/demo-requests'), {
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
