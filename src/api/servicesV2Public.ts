import { apiUrl } from './client';
import { tenantFromHost } from '../utils/tenantDomains';

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

function getStoredTenant(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored =
    localStorage.getItem('tenantSubdomain') ||
    localStorage.getItem('tenantId') ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    undefined;
  if (stored === 'demo') return undefined;
  return stored || undefined;
}

export function getTenantId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const sub = tenantFromHost(window.location.host) ?? undefined;
  // Prefer host-derived tenant first (prevents stale localStorage like "demo")
  if (sub) {
    localStorage.setItem('tenantSubdomain', sub);
    localStorage.setItem('tenantId', sub);
    return sub;
  }
  const stored = getStoredTenant();
  return stored;
}
