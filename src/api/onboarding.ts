import { buildHeaders, readJsonResponse } from './client';

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

const emptyOnboardingStatus = (): OnboardingStatus => ({
  businessName: '',
  subdomain: '',
  timezone: null,
  countryCode: null,
  postalCode: null,
  servicesAdded: false,
  staffAdded: false,
  qrPrinted: false,
  reviewSmsEnabled: false,
  billingReady: false,
  completed: false,
  onboardingBannerDismissed: false,
});

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  '';

export async function fetchOnboardingStatus(force = false): Promise<OnboardingStatus> {
  if (cache && !force) return cache;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildHeaders({ auth: true, tenant: true }),
  };
  const res = await fetch(`${apiBase}/api/onboarding/status`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to load onboarding status');
  cache = await readJsonResponse(res, emptyOnboardingStatus());
  return cache;
}

export async function markQrPrinted(): Promise<OnboardingStatus> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildHeaders({ auth: true, tenant: true }),
  };
  const res = await fetch(`${apiBase}/api/onboarding/qr-printed`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to update QR status');
  cache = await readJsonResponse(res, emptyOnboardingStatus());
  return cache;
}

export function clearOnboardingCache() {
  cache = null;
}

export async function dismissOnboardingBanner(): Promise<OnboardingStatus> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildHeaders({ auth: true, tenant: true }),
  };
  const res = await fetch(`${apiBase}/api/onboarding/dismiss-banner`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to dismiss onboarding banner');
  cache = await readJsonResponse(res, emptyOnboardingStatus());
  return cache;
}

export async function updateOnboardingLocation(input: {
  countryCode: string;
  postalCode: string;
  timezone?: string;
}): Promise<OnboardingStatus> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildHeaders({ auth: true, tenant: true }),
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
  cache = await readJsonResponse(res, emptyOnboardingStatus());
  return cache;
}
