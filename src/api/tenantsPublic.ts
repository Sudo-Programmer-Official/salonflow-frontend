import { apiUrl, buildHeaders } from './client';

export type TenantExistsResponse = {
  exists: boolean;
  name: string | null;
  city: string | null;
};

export async function checkTenantExists(slug: string): Promise<TenantExistsResponse> {
  const url = new URL(apiUrl('/public/tenant-exists'), window.location.origin);
  url.searchParams.set('slug', slug);
  const res = await fetch(url.toString(), {
    headers: buildHeaders({ json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to check salon');
  }
  return res.json();
}
