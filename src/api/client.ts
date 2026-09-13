const resolvedApiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '';

import { isDemoGatewayHost, isPlatformHost, tenantFromHost } from '../utils/tenantDomains';

const authHeader = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const clientHeader = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  return localStorage.getItem('client') === 'salonflow_pos'
    ? { 'x-pos-client': 'true' }
    : {};
};

const websiteHostHeader = (): Record<string, string> => {
  if (typeof window === 'undefined' || !window.location.host) return {};
  return { 'x-website-host': window.location.host };
};

const tenantHeader = (): Record<string, string> => {
  const host = typeof window !== 'undefined' ? window.location.host : undefined;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const hostnameTenant = tenantFromHost(host) ?? undefined;
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

  // Demo gateway requests still need the canonical tenant context for the API
  // tenant resolver, even though the gateway itself is a reserved app host.
  if (tenantId && (!isPlatformHost(host) || isDemoGatewayHost(host))) {
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
  ...websiteHostHeader(),
  ...(opts.json ? { 'Content-Type': 'application/json' } : {}),
  ...(opts.auth ? authHeader() : {}),
  ...(opts.tenant ? tenantHeader() : {}),
  ...(opts.auth ? clientHeader() : {}),
});

export async function readJsonResponse<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (_error) {
    return fallback;
  }
}

export { authHeader, tenantHeader, isPlatformHost };

const client = { apiUrl, buildHeaders, authHeader, tenantHeader, isPlatformHost };

export default client;
