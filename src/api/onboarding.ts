export type OnboardingStatus = {
  businessName: string;
  subdomain: string;
  timezone?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  servicesAdded: boolean;
  staffAdded: boolean;
  qrPrinted: boolean;
  reviewSmsEnabled: boolean;
  billingReady: boolean;
  completed: boolean;
  onboardingBannerDismissed?: boolean;
};

let cache: OnboardingStatus | null = null;

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  '';

const isPlatformHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'platform.localhost' || host.startsWith('platform.');
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

  const tenantId =
    hostnameTenant ||
    envTenant ||
    (storedTenant && !isUuid(storedTenant) ? storedTenant : undefined);

  if (tenantId && !isPlatformHost()) {
    return { 'x-tenant-id': tenantId };
  }
  return {};
};

export async function fetchOnboardingStatus(force = false): Promise<OnboardingStatus> {
  if (cache && !force) return cache;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...tenantHeader(),
  };
  const res = await fetch(`${apiBase}/api/onboarding/status`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to load onboarding status');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}

export async function markQrPrinted(): Promise<OnboardingStatus> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...tenantHeader(),
  };
  const res = await fetch(`${apiBase}/api/onboarding/qr-printed`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to update QR status');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}

export function clearOnboardingCache() {
  cache = null;
}

export async function dismissOnboardingBanner(): Promise<OnboardingStatus> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...tenantHeader(),
  };
  const res = await fetch(`${apiBase}/api/onboarding/dismiss-banner`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to dismiss onboarding banner');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}

export async function updateOnboardingLocation(input: {
  countryCode: string;
  postalCode: string;
  timezone?: string;
}): Promise<OnboardingStatus> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...tenantHeader(),
  };
  const res = await fetch(`${apiBase}/api/onboarding/location`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      countryCode: input.countryCode,
      postalCode: input.postalCode,
      timezone: input.timezone,
    }),
  });
  if (!res.ok) throw new Error('Failed to update location');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}
