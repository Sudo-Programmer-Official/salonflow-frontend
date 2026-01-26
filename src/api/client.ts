const resolvedApiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '';

const PLATFORM_HOSTS = ['salonflow.studio', 'www.salonflow.studio', 'app.salonflow.studio', 'api.salonflow.studio'];
const isPlatformHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (PLATFORM_HOSTS.includes(host)) return true;
  return host === 'platform.localhost' || host.startsWith('platform.');
};

const authHeader = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const tenantHeader = (): Record<string, string> => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const hostnameTenant = hostname ? hostname.split('.')[0] ?? undefined : undefined;
  const envTenant = import.meta.env.VITE_TENANT_ID as string | undefined;
  const storedTenant =
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined);

  // Avoid sending UUIDs as subdomains (basic uuid check)
  const isUuid = (val: string | undefined) => !!val && /^[0-9a-fA-F-]{36}$/.test(val);

  const isLocal = hostname ? hostname.includes('localhost') : false;

  // For local/dev, allow env or stored tenant to override the host subdomain
  const candidate = isLocal
    ? envTenant || storedTenant || hostnameTenant
    : hostnameTenant || envTenant || storedTenant;

  const tenantId = candidate && !isUuid(candidate) ? candidate : undefined;

  if (tenantId && !isPlatformHost()) {
    return { 'x-tenant-id': tenantId };
  }
  return {};
};

export const apiUrl = (path: string) =>
  `${resolvedApiBase}/api${path.startsWith('/') ? '' : '/'}${path}`;

export const buildHeaders = (opts: {
  auth?: boolean;
  tenant?: boolean;
  json?: boolean;
} = {}) => ({
  ...(opts.json ? { 'Content-Type': 'application/json' } : {}),
  ...(opts.auth ? authHeader() : {}),
  ...(opts.tenant ? tenantHeader() : {}),
});

export { authHeader, tenantHeader, isPlatformHost };

const client = { apiUrl, buildHeaders, authHeader, tenantHeader, isPlatformHost };

export default client;
