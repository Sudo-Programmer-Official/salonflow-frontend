import { apiUrl, buildHeaders } from './client';

export type V2Category = {
  id: string;
  name: string;
  slug: string | null;
  heroImage: string | null;
  shortDescription: string | null;
  highlights: string[];
  featured: boolean;
  featuredOrder: number;
  published: boolean;
  sortOrder: number;
  servicesCount?: number;
};

export type V2Service = {
  id: string;
  categoryId: string;
  name: string;
  slug: string | null;
  shortSummary: string | null;
  fullDescription: string | null;
  whatIncluded: any[];
  addons: any[];
  durationMinutes: number;
  priceCents: number;
  currency: string;
  order: number;
  published: boolean;
  featured: boolean;
  featuredOrder: number;
};

const authHeaders = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function fetchV2Categories() {
  const res = await fetch(apiUrl('/admin/v2/services/categories'), { headers: authHeaders() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load categories');
  return body.categories as V2Category[];
}

export async function saveV2Category(id: string | null, payload: Partial<V2Category>) {
  const url = apiUrl(`/admin/v2/services/categories${id ? `/${id}` : ''}`);
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save category');
  return body as V2Category;
}

export async function fetchV2CategoryWithServices(id: string) {
  const res = await fetch(apiUrl(`/admin/v2/services/categories/${id}`), { headers: authHeaders() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load category');
  return body as { category: V2Category; services: V2Service[] };
}

export async function saveV2Service(id: string | null, payload: Partial<V2Service> & { categoryId: string }) {
  const url = apiUrl(`/admin/v2/services/services${id ? `/${id}` : ''}`);
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save service');
  return body as V2Service;
}

export async function reorderV2Categories(items: { id: string; order: number }[]) {
  const res = await fetch(apiUrl('/admin/v2/services/reorder/categories'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to reorder categories');
  return true;
}

export async function reorderV2Services(items: { id: string; order: number }[]) {
  const res = await fetch(apiUrl('/admin/v2/services/reorder/services'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to reorder services');
  return true;
}
