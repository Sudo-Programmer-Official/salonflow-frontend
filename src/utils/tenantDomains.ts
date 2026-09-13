const DEFAULT_TENANT_BASE_DOMAIN = 'salonflow.studio';
const DEFAULT_PLATFORM_HOST = 'app.salonflow.studio';
const DEFAULT_API_HOST = 'api.salonflow.studio';
const DEFAULT_STAGING_ROOT_HOST = 'staging.salonflow.studio';
const DEFAULT_STAGING_PLATFORM_HOST = 'platform.staging.salonflow.studio';
const DEFAULT_STAGING_API_HOST = 'api-staging.salonflow.studio';
const DEFAULT_STAGING_DEMO_HOST = 'demo.staging.salonflow.studio';
const RENDER_HOST_SUFFIX = '.onrender.com';
const TENANT_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export type TenantDomainConfig = {
  tenantBaseDomain: string;
  platformHost: string;
  apiHost: string;
  demoPublicHost?: string;
};

const normalizeHost = (value?: string | null): string => {
  if (!value) return '';
  let normalized = value.trim().toLowerCase();
  if (!normalized) return '';

  if (normalized.includes('://')) {
    try {
      normalized = new URL(normalized).host.toLowerCase();
    } catch (_error) {
      return '';
    }
  } else {
    normalized = normalized.split('/')[0] ?? '';
  }

  return normalized.replace(/\.$/, '');
};

const hostnameOnly = (host: string): string => {
  if (host.startsWith('[')) {
    const closingBracket = host.indexOf(']');
    return closingBracket >= 0 ? host.slice(0, closingBracket + 1) : host;
  }
  const colon = host.lastIndexOf(':');
  return colon > -1 && /^\d+$/.test(host.slice(colon + 1)) ? host.slice(0, colon) : host;
};

const portOnly = (host: string): string | null => {
  if (host.startsWith('[')) {
    const closingBracket = host.indexOf(']');
    const port = closingBracket >= 0 ? host.slice(closingBracket + 1) : '';
    return port.startsWith(':') ? port.slice(1) : null;
  }
  const colon = host.lastIndexOf(':');
  return colon > -1 && /^\d+$/.test(host.slice(colon + 1)) ? host.slice(colon + 1) : null;
};

const hostsMatch = (actualHost: string, configuredHost: string): boolean => {
  const actual = normalizeHost(actualHost);
  const configured = normalizeHost(configuredHost);
  if (!actual || !configured) return false;
  const configuredPort = portOnly(configured);
  if (configuredPort) return actual === configured;
  return hostnameOnly(actual) === hostnameOnly(configured);
};

export const isRenderHost = (host?: string): boolean => {
  const actual = normalizeHost(host);
  const hostname = hostnameOnly(actual);
  if (!hostname.endsWith(RENDER_HOST_SUFFIX)) return false;

  const serviceLabel = hostname.slice(0, -RENDER_HOST_SUFFIX.length);
  return Boolean(serviceLabel && !serviceLabel.includes('.') && TENANT_LABEL_PATTERN.test(serviceLabel));
};

export const getTenantDomainConfig = (currentHost?: string): TenantDomainConfig => {
  const host = currentHost || (typeof window !== 'undefined' ? window.location.host : '');
  const hostname = hostnameOnly(normalizeHost(host));
  const isLocal = hostname.includes('localhost') || hostname.startsWith('127.');
  const configuredBase = (import.meta.env.VITE_TENANT_BASE_DOMAIN as string | undefined)?.trim();
  const configuredEnvironment = String(
    import.meta.env.VITE_APP_ENV || import.meta.env.MODE || '',
  ).trim().toLowerCase();
  const isStaging = configuredEnvironment === 'staging';
  const derivedBase = isLocal
    ? normalizeHost(host)
    : hostname === DEFAULT_TENANT_BASE_DOMAIN || hostname === `www.${DEFAULT_TENANT_BASE_DOMAIN}`
      ? DEFAULT_TENANT_BASE_DOMAIN
      : hostname.endsWith(`.${DEFAULT_TENANT_BASE_DOMAIN}`)
        ? hostname.split('.').slice(1).join('.')
        : DEFAULT_TENANT_BASE_DOMAIN;

  return {
    tenantBaseDomain:
      configuredBase ||
      (isStaging && !isLocal ? DEFAULT_STAGING_ROOT_HOST : derivedBase || DEFAULT_TENANT_BASE_DOMAIN),
    platformHost:
      (import.meta.env.VITE_PLATFORM_HOST as string | undefined)?.trim() ||
      (isStaging && !isLocal ? DEFAULT_STAGING_PLATFORM_HOST : DEFAULT_PLATFORM_HOST),
    apiHost:
      (() => {
        const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
        if (apiBase) {
          try {
            return new URL(apiBase).host;
          } catch (_error) {
            // Fall through to the stable production default.
          }
        }
        return isStaging && !isLocal ? DEFAULT_STAGING_API_HOST : DEFAULT_API_HOST;
      })(),
    demoPublicHost:
      (import.meta.env.VITE_DEMO_PUBLIC_HOST as string | undefined)?.trim() ||
      (isStaging && !isLocal
        ? DEFAULT_STAGING_DEMO_HOST
        : `demo.${configuredBase || derivedBase || DEFAULT_TENANT_BASE_DOMAIN}`),
  };
};

export const isDemoGatewayHost = (
  host?: string,
  config: TenantDomainConfig = getTenantDomainConfig(host),
): boolean => {
  const actual = normalizeHost(host || (typeof window !== 'undefined' ? window.location.host : ''));
  return Boolean(actual && config.demoPublicHost && hostsMatch(actual, config.demoPublicHost));
};

export const isPlatformHost = (
  host?: string,
  config: TenantDomainConfig = getTenantDomainConfig(host),
): boolean => {
  const actual = normalizeHost(host || (typeof window !== 'undefined' ? window.location.host : ''));
  if (!actual) return false;

  const baseDomain = normalizeHost(config.tenantBaseDomain);
  const configuredPlatformHost = normalizeHost(config.platformHost);
  const configuredApiHost = normalizeHost(config.apiHost);
  return (
    isRenderHost(actual) ||
    isDemoGatewayHost(actual, config) ||
    hostsMatch(actual, config.tenantBaseDomain) ||
    hostsMatch(actual, config.platformHost) ||
    hostsMatch(actual, config.apiHost) ||
    hostsMatch(actual, DEFAULT_STAGING_ROOT_HOST) ||
    hostsMatch(actual, DEFAULT_STAGING_PLATFORM_HOST) ||
    hostsMatch(actual, DEFAULT_STAGING_API_HOST) ||
    hostsMatch(actual, DEFAULT_STAGING_DEMO_HOST) ||
    hostsMatch(actual, 'salonflow.studio') ||
    hostsMatch(actual, 'www.salonflow.studio') ||
    hostsMatch(actual, 'app.salonflow.studio') ||
    hostsMatch(actual, 'api.salonflow.studio') ||
    hostnameOnly(actual) === `platform.${hostnameOnly(baseDomain)}` ||
    ['api', 'app', 'platform', 'www'].some(
      (label) => hostnameOnly(actual) === `${label}.${hostnameOnly(baseDomain)}`,
    ) ||
    hostnameOnly(actual) === configuredPlatformHost ||
    hostnameOnly(actual) === configuredApiHost ||
    hostsMatch(actual, 'platform.localhost')
  );
};

export const tenantFromHost = (
  host?: string,
  config: TenantDomainConfig = getTenantDomainConfig(host),
): string | null => {
  const actual = normalizeHost(host || (typeof window !== 'undefined' ? window.location.host : ''));
  const baseDomain = normalizeHost(config.tenantBaseDomain);
  if (!actual || !baseDomain || isPlatformHost(actual, config) || isDemoGatewayHost(actual, config)) return null;

  const configuredPort = portOnly(baseDomain);
  if (configuredPort && portOnly(actual) !== configuredPort) return null;

  const hostname = hostnameOnly(actual);
  const baseHostname = hostnameOnly(baseDomain);
  const suffix = `.${baseHostname}`;
  if (!hostname.endsWith(suffix)) return null;

  const label = hostname.slice(0, -suffix.length);
  return label &&
    !label.includes('.') &&
    !['api', 'app', 'platform', 'www'].includes(label) &&
    TENANT_LABEL_PATTERN.test(label)
    ? label
    : null;
};

export const isStagingEnvironment = (environment?: string): boolean =>
  String(environment || import.meta.env.VITE_APP_ENV || import.meta.env.MODE || '')
    .trim()
    .toLowerCase() === 'staging';
