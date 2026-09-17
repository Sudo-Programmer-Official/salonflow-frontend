export const CANONICAL_DEMO_TENANT_SUBDOMAIN = 'mtvnailsdemo';

export const buildDemoTenantAccessPath = (rawToken: string): string =>
  `demo/access/${encodeURIComponent(rawToken)}`;

export const scrubDemoAccessUrl = (href: string): string => {
  const url = new URL(href);
  const marker = '/demo/access/';
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex >= 0) {
    url.pathname = `${url.pathname.slice(0, markerIndex)}/demo/access`;
  }
  url.search = '';
  url.hash = '';
  return url.toString();
};
