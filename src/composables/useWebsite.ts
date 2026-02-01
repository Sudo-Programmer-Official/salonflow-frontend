import { ref } from 'vue';
import { apiUrl, buildHeaders } from '../api/client';
import { applyWebsiteTheme } from '../utils/websiteTheme';

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

const cache: Record<string, WebsitePayload | null> = {};

export function useWebsite(locale: 'en' | 'es') {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<WebsitePayload | null>(null);

  const fetchSite = async () => {
    if (cache[locale] && !(typeof window !== 'undefined' && window.location.search.includes('websitePreview=1'))) {
      data.value = cache[locale];
      applyWebsiteTheme(cache[locale]?.themeTokens || null);
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const isPreview =
        typeof window !== 'undefined' &&
        window.location.search.includes('websitePreview=1') &&
        localStorage.getItem('token');

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
        cache: isPreview ? 'no-store' : 'default',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Website not found');
      data.value = body;
      applyWebsiteTheme(body.themeTokens || null);
      if (!isPreview) {
        cache[locale] = body;
      }
    } catch (err: any) {
      error.value = err?.message || 'Failed to load website';
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, data, fetchSite };
}

export function clearWebsiteCache(locale?: 'en' | 'es') {
  if (locale) {
    delete cache[locale];
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
}
