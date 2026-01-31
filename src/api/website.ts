import { apiUrl, buildHeaders } from './client';

export type WebsiteSite = {
  id: string;
  business_id: string;
  default_domain: string;
  primary_domain: string | null;
  published: boolean;
};

export type WebsiteDomain = {
  id: string;
  business_id: string;
  domain: string;
  verified: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at?: string;
};

export type WebsitePage = {
  id: string;
  business_id: string;
  slug: string;
  locale: string;
  content: any;
  seo: any;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type WebsiteLead = {
  id: string;
  business_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  preferred_time?: string | null;
  status: 'new' | 'contacted' | 'closed' | 'converted';
  notes?: string | null;
  source_page?: string | null;
  locale: string;
  conversation_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteMedia = {
  id: string;
  business_id: string;
  original_url: string;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  variants: Record<
    string,
    {
      url: string;
      width: number;
      height: number;
      mimeType: string;
    }
  >;
  created_at: string;
};

export type WebsiteNavItem = {
  id?: string;
  label: string;
  path: string;
  visible: boolean;
  position: number;
  locale: string;
};

export type WebsiteHeaderConfig = {
  enabled: boolean;
  nav?: Array<{ label: string; page: 'home' | 'services' | 'about' | 'contact'; path?: string }>;
  ctas?: {
    call?: { enabled: boolean };
    book?: { enabled: boolean; url?: string | null };
  };
};

export type WebsiteFooterConfig = {
  enabled: boolean;
  location?: {
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  contact?: {
    phone?: string | null;
    email?: string | null;
  } | null;
  hours?: {
    source: 'manual' | 'kiosk';
    manual?: Array<{ day: string; open: string; close: string }>;
  } | null;
  social?: {
    instagram?: string | null;
    facebook?: string | null;
    google?: string | null;
  } | null;
  legal?: {
    showPrivacy: boolean;
    showTerms: boolean;
    copyrightText?: string | null;
  } | null;
};

export type WebsiteLayout = {
  header: WebsiteHeaderConfig;
  footer: WebsiteFooterConfig;
  updatedAt?: string;
};

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function fetchWebsiteSite(locale?: string) {
  const url = locale ? apiUrl(`/website/site?locale=${locale}`) : apiUrl('/website/site');
  const res = await fetch(url, { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load website');
  return body as { site: WebsiteSite; domains: WebsiteDomain[]; pages: WebsitePage[]; nav?: WebsiteNavItem[]; media?: WebsiteMedia[]; layout?: WebsiteLayout };
}

export async function fetchWebsiteDomains() {
  const res = await fetch(apiUrl('/website/domains'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load domains');
  return body.domains as WebsiteDomain[];
}

export async function fetchWebsitePages(locale?: string) {
  const url = locale ? apiUrl(`/website/pages?locale=${locale}`) : apiUrl('/website/pages');
  const res = await fetch(url, { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load pages');
  return body.pages as WebsitePage[];
}

export async function upsertWebsitePage(
  slug: string,
  locale: string,
  payload: { content: any; seo: any; published: boolean },
) {
  const res = await fetch(apiUrl(`/website/pages/${slug}?locale=${locale}`), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save page');
  return body.page as WebsitePage;
}

export async function updateWebsiteSite(input: { published?: boolean; primaryDomainId?: string }) {
  const res = await fetch(apiUrl('/website/site'), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update site');
  return body as { site: WebsiteSite; domains: WebsiteDomain[]; pages: WebsitePage[]; layout?: WebsiteLayout };
}

export async function addWebsiteDomain(domain: string) {
  const res = await fetch(apiUrl('/website/domains'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ domain }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to add domain');
  return body.domain as WebsiteDomain;
}

export async function verifyWebsiteDomain(id: string, makePrimary = false) {
  const res = await fetch(apiUrl(`/website/domains/${id}/verify`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ makePrimary }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to verify domain');
  return body.domain as WebsiteDomain;
}

export async function fetchWebsiteLeads(status?: string) {
  const url = status ? apiUrl(`/website/leads?status=${status}`) : apiUrl('/website/leads');
  const res = await fetch(url, { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load leads');
  return body.leads as WebsiteLead[];
}

export async function updateWebsiteLeadStatus(
  id: string,
  status: 'new' | 'contacted' | 'closed' | 'converted',
  notes?: string,
) {
  const res = await fetch(apiUrl(`/website/leads/${id}`), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status, notes }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update lead');
  return body.lead as WebsiteLead;
}

export async function listWebsiteMedia(limit = 50) {
  const res = await fetch(apiUrl(`/website/media?limit=${limit}`), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load media');
  return body.media as WebsiteMedia[];
}

export async function uploadWebsiteMedia(form: FormData) {
  const res = await fetch(apiUrl('/website/media/upload'), {
    method: 'POST',
    headers: { ...buildHeaders({ auth: true, tenant: true }), Accept: 'application/json' },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to upload');
  return body.media as WebsiteMedia;
}

export async function fetchWebsiteNav(locale = 'en') {
  const res = await fetch(apiUrl(`/website/nav?locale=${locale}`), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load navigation');
  return body.items as WebsiteNavItem[];
}

export async function saveWebsiteNav(locale: string, items: WebsiteNavItem[]) {
  const res = await fetch(apiUrl(`/website/nav?locale=${locale}`), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ items }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save navigation');
  return body.items as WebsiteNavItem[];
}

export async function fetchWebsiteLayout(locale = 'en') {
  const res = await fetch(apiUrl(`/website/layout?locale=${locale}`), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load layout');
  return body.layout as WebsiteLayout;
}

export async function saveWebsiteFooter(footer: WebsiteFooterConfig) {
  const res = await fetch(apiUrl('/website/layout/footer'), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ footer }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save footer');
  return body.footer as WebsiteFooterConfig;
}

export async function saveWebsiteHeader(header: WebsiteHeaderConfig, locale = 'en') {
  const res = await fetch(apiUrl(`/website/layout/header?locale=${locale}`), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ header }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save header');
  return body.header as WebsiteHeaderConfig & { nav?: WebsiteNavItem[] };
}

export async function fetchWebsiteAnalyticsSummary(days = 30, locale?: string) {
  const url = apiUrl(`/website/analytics/summary?days=${days}${locale ? `&locale=${locale}` : ''}`);
  const res = await fetch(url, { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load analytics');
  return body.summary as Array<{ event_type: string; path: string | null; count: number }>;
}
