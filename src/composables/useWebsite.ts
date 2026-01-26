import { ref } from 'vue';
import { apiUrl, buildHeaders } from '../api/client';

type WebsitePayload = {
  site: { primary_domain: string | null; default_domain: string };
  domains: Array<{ domain: string; is_primary: boolean; verified: boolean }>;
  pages: Array<{ slug: string; locale: string; content: any; seo: any; published: boolean }>;
  meta?: { canonical?: string; locales?: string[]; host?: string };
};

const cache: Record<string, WebsitePayload | null> = {};

export function useWebsite(locale: 'en' | 'es') {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<WebsitePayload | null>(null);

  const fetchSite = async () => {
    if (cache[locale]) {
      data.value = cache[locale];
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

      const res = await fetch(url, {
        headers: isPreview ? buildHeaders({ auth: true, tenant: true }) : undefined,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Website not found');
      data.value = body;
      cache[locale] = body;
    } catch (err: any) {
      error.value = err?.message || 'Failed to load website';
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, data, fetchSite };
}
