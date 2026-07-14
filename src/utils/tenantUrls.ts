const DEFAULT_LIVE_DOMAIN = 'salonflow.studio';

type TenantUrlOptions = {
  protocol?: string;
  baseDomain?: string;
};

const normalizePath = (path: string) => path.replace(/^\/+/, '');

const deriveBaseDomain = (host: string, hostname: string) => {
  const parts = host.split('.');
  if (hostname.includes('localhost') || hostname.startsWith('127.')) {
    return parts.length > 1 ? parts.slice(1).join('.') || host : host;
  }
  if (parts.length > 2) {
    return parts.slice(1).join('.') || host;
  }
  return host || DEFAULT_LIVE_DOMAIN;
};

const resolveRuntimeConfig = () => {
  if (typeof window === 'undefined') {
    return { protocol: 'https:', baseDomain: DEFAULT_LIVE_DOMAIN };
  }

  const hostname = window.location.hostname.toLowerCase();
  const host = window.location.host;
  const isLocal = hostname.includes('localhost') || hostname.startsWith('127.');

  return {
    protocol: isLocal ? window.location.protocol : 'https:',
    baseDomain: deriveBaseDomain(host, hostname) || DEFAULT_LIVE_DOMAIN,
  };
};

export const buildTenantUrl = (subdomain: string, path = '', options: TenantUrlOptions = {}) => {
  const cleanSubdomain = subdomain.trim();
  if (!cleanSubdomain) return '';

  const runtime = resolveRuntimeConfig();
  const protocol = options.protocol ?? runtime.protocol;
  const baseDomain = options.baseDomain ?? runtime.baseDomain;
  const suffix = path ? `/${normalizePath(path)}` : '';
  return `${protocol}//${cleanSubdomain}.${baseDomain}${suffix}`;
};

export const buildTenantAdminUrl = (subdomain: string, options?: TenantUrlOptions) =>
  buildTenantUrl(subdomain, 'admin', options);

export const buildTenantLoginUrl = (subdomain: string, options?: TenantUrlOptions) =>
  buildTenantUrl(subdomain, 'app/login', options);

export const buildTenantCheckInUrl = (subdomain: string, options?: TenantUrlOptions) =>
  buildTenantUrl(subdomain, 'check-in', options);

export const buildTenantKioskUrl = (subdomain: string, options?: TenantUrlOptions) =>
  buildTenantUrl(subdomain, `kiosk/checkin/${subdomain.trim()}`, options);

