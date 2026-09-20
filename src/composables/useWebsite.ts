import { ref } from 'vue';
import { apiUrl, buildHeaders } from '../api/client';
import { applyWebsiteTheme } from '../utils/websiteTheme';
import { tenantFromHost } from '../utils/tenantDomains';

type MediaVariant = {
  url: string;
  width: number;
  height: number;
  mimeType: string;
};

export type WebsiteMedia = {
  id: string;
  business_id: string;
  original_url: string;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  variants: Record<string, MediaVariant>;
};

type WebsiteNavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  position: number;
  locale: string;
};

type WebsitePayload = {
  site: { primary_domain: string | null; default_domain: string };
  domains: Array<{ domain: string; is_primary: boolean; verified: boolean }>;
  pages: Array<{ slug: string; locale: string; content: any; seo: any; published: boolean }>;
  nav?: WebsiteNavItem[];
  media?: WebsiteMedia[];
  meta?: { canonical?: string; locales?: string[]; host?: string };
  themeTokens?: any;
  businessHours?: any;
  layout?: {
    header: {
      enabled: boolean;
      nav?: Array<{ label: string; page: string; path?: string }>;
      ctas?: {
        call?: { enabled: boolean };
        book?: { enabled: boolean; url?: string | null };
      };
    };
    footer: any;
  };
};

export function useWebsite(locale: 'en' | 'es') {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<WebsitePayload | null>(null);

  const fetchSite = async () => {
    const isPreview =
      typeof window !== 'undefined' &&
      window.location.search.includes('websitePreview=1') &&
      localStorage.getItem('token');
    loading.value = true;
    error.value = null;
    try {
      const url = isPreview
        ? apiUrl(`/website/site?locale=${locale}`)
        : apiUrl(`/public/website?locale=${locale}`);

      const websiteHostHeader =
        typeof window !== 'undefined' && window.location.host
          ? { 'x-website-host': window.location.host }
          : undefined;

      const res = await fetch(url, {
        headers: isPreview
          ? { ...buildHeaders({ auth: true, tenant: true }), ...(websiteHostHeader || {}) }
          : websiteHostHeader,
        // Published media/page changes must be visible without requiring a
        // hard refresh. Image objects remain cacheable because their keys are
        // immutable, while this small JSON payload is revalidated every time.
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Website not found');
      data.value = body;
      // Persist tenant subdomain so public API calls (services v2, etc.) work even on custom domains
      if (typeof window !== 'undefined') {
        const defaultDomain = body?.site?.default_domain as string | undefined;
        const hostSub = tenantFromHost(window.location.host) ?? undefined;
        const subdomain =
          hostSub ||
          defaultDomain
            ?.replace(/^https?:\/\//, '')
            ?.split('.')
            ?.[0];
        if (subdomain && subdomain !== 'demo') {
          localStorage.setItem('tenantSubdomain', subdomain);
          localStorage.setItem('tenantId', subdomain);
        }
      }
      applyWebsiteTheme(body.themeTokens || null);
    } catch (err: any) {
      error.value = err?.message || 'Failed to load website';
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, data, fetchSite };
}

export function clearWebsiteCache(locale?: 'en' | 'es') {
  // Kept as a compatibility hook for admin publish flows. Public website
  // metadata is intentionally fetched fresh instead of held in module cache.
  void locale;
}
