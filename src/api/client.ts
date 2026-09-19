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

const isUuid = (val: string | undefined) => !!val && /^[0-9a-fA-F-]{36}$/.test(val);

export const tenantHeaderForContext = (input: {
  host?: string;
  hostname?: string;
  envTenant?: string;
  storedTenantSubdomain?: string;
  storedTenantId?: string;
}): Record<string, string> => {
  const host = input.host;
  const hostname = input.hostname;
  const demoGateway = isDemoGatewayHost(host);
  const hostnameTenant = demoGateway ? undefined : tenantFromHost(host) ?? undefined;
  const envTenant = input.envTenant;
  const storedTenantSubdomain = input.storedTenantSubdomain;
  const storedTenantId = input.storedTenantId;
  const storedTenant = storedTenantSubdomain || storedTenantId;

  const isLocal = hostname ? hostname.includes('localhost') : false;

  // The demo gateway is neutral. Its tenant can only come from the
  // authenticated token exchange; never derive the reserved label "demo"
  // from the hostname or use a build-wide tenant override.
  const candidate = demoGateway
    ? storedTenantSubdomain
    : isLocal
      ? envTenant || storedTenant || hostnameTenant
      : hostnameTenant || envTenant || storedTenant;

  const tenantId = candidate && !isUuid(candidate) ? candidate : undefined;

  // Demo gateway requests need the canonical tenant context returned by the
  // server-side token exchange. If it is unavailable, send no tenant hint
  // rather than incorrectly claiming the tenant is "demo".
  if (tenantId && (!isPlatformHost(host) || isDemoGatewayHost(host))) {
    return { 'x-tenant-id': tenantId };
  }
  return {};
};

const tenantHeader = (): Record<string, string> => {
  const host = typeof window !== 'undefined' ? window.location.host : undefined;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  return tenantHeaderForContext({
    host,
    hostname,
    envTenant: import.meta.env.VITE_TENANT_ID as string | undefined,
    storedTenantSubdomain:
      typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined,
    storedTenantId:
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined,
  });
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
