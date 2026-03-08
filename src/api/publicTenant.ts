const isUuid = (value: string | null | undefined) =>
  Boolean(value && /^[0-9a-fA-F-]{36}$/.test(value));

const getStoredTenant = () => {
  if (typeof window === 'undefined') return null;
  const tenant =
    localStorage.getItem('tenantSubdomain') ??
    localStorage.getItem('tenantId');
  if (!tenant || isUuid(tenant)) return null;
  return tenant;
};

export const buildPublicTenantHeaders = () => {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined' && window.location.host) {
    headers['x-website-host'] = window.location.host;
  }

  const tenant = getStoredTenant();
  if (tenant) {
    headers['x-tenant-id'] = tenant;
  }

  return headers;
};
