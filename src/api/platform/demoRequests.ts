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
