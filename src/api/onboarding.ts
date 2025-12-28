export type OnboardingStatus = {
  businessName: string;
  subdomain: string;
  completed: boolean;
  progress: number;
  steps: {
    services: boolean;
    staff: boolean;
    qrPrinted: boolean;
    reviewSmsEnabled: boolean;
    billingReady: boolean;
  };
  shouldSeedDemo: boolean;
  qrPrintedAt: string | null;
  isTestMode: boolean;
};

let cache: OnboardingStatus | null = null;

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchOnboardingStatus(force = false): Promise<OnboardingStatus> {
  if (cache && !force) return cache;
  const res = await fetch('/api/onboarding/status', {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load onboarding status');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}

export async function seedDemoServices(): Promise<OnboardingStatus> {
  const res = await fetch('/api/onboarding/seed-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to seed demo services');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}

export async function markQrPrinted(): Promise<OnboardingStatus> {
  const res = await fetch('/api/onboarding/qr-printed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to update QR status');
  cache = (await res.json()) as OnboardingStatus;
  return cache;
}

export function clearOnboardingCache() {
  cache = null;
}
