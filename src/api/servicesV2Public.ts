import { apiUrl } from './client';

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  heroImage?: string | null;
  shortDescription?: string | null;
  highlights?: string[];
  featured?: boolean;
  featuredOrder?: number;
};

export type PublicService = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  shortSummary?: string | null;
  fullDescription?: string | null;
  whatIncluded?: any[];
  addons?: any[];
  durationMinutes?: number;
  priceCents?: number;
  currency?: string;
  featured?: boolean;
  featuredOrder?: number;
};

export async function fetchFeaturedServicesV2() {
  const tenant = getTenantId();
  const res = await fetch(apiUrl(`/public/v2/services/featured${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`), {
    headers: tenant ? { 'x-tenant-id': tenant } : {},
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load featured services');
  return body as { categories: PublicCategory[]; services: PublicService[] };
}

export async function fetchCategoriesV2() {
  const tenant = getTenantId();
  const res = await fetch(
    apiUrl(`/public/v2/services/categories${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`),
    { headers: tenant ? { 'x-tenant-id': tenant } : {} },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load categories');
  return body.categories as PublicCategory[];
}

export async function fetchCategoryV2(slug: string) {
  const tenant = getTenantId();
  const res = await fetch(
    apiUrl(
      `/public/v2/services/categories/${slug}${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`,
    ),
    { headers: tenant ? { 'x-tenant-id': tenant } : {} },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Category not found');
  return body as { category: PublicCategory; services: PublicService[] };
}

export async function fetchServiceV2(categorySlug: string, serviceSlug: string) {
  const tenant = getTenantId();
  const res = await fetch(
    apiUrl(
      `/public/v2/services/${categorySlug}/${serviceSlug}${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`,
    ),
    { headers: tenant ? { 'x-tenant-id': tenant } : {} },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Service not found');
  return body as { category: PublicCategory; service: PublicService };
}

// ---- helpers ----
function normalizeHost(host?: string | null): string {
  if (!host) return '';
  return host.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/^www\./, '').toLowerCase();
}

function extractSubdomainFromHost(host: string): string | undefined {
  const parts = host.split('.');
  if (parts.length < 3) return undefined;
  return parts[0];
}

function getStoredTenant(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    localStorage.getItem('tenantSubdomain') ||
    localStorage.getItem('tenantId') ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    undefined
  );
}

export function getTenantId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = getStoredTenant();
  if (stored) return stored;
  const host = normalizeHost(window.location.hostname);
  const sub = extractSubdomainFromHost(host);
  return sub;
}
