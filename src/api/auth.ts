type LoginResponse = {
  token: string;
  user: {
    id: string;
    businessId: string;
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'CUSTOMER';
    email?: string;
  };
};

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  '';

const isPlatformHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'platform.localhost' || host.startsWith('platform.');
};

export async function login(input: { email: string; password: string }): Promise<LoginResponse> {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const hostnameTenant = hostname ? hostname.split('.')[0] ?? undefined : undefined;
  const tenantId =
    hostnameTenant ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const platformHost = isPlatformHost();
  if (tenantId && !platformHost) headers['x-tenant-id'] = tenantId;
  if (platformHost) {
    headers['x-platform-login'] = 'true';
  }
  if (tenantId && typeof window !== 'undefined' && !platformHost) {
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('tenantSubdomain', tenantId);
  }

  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid credentials');
  }

  return res.json();
}

export async function magicLogin(token: string): Promise<LoginResponse> {
  const res = await fetch(`${apiBase}/api/auth/magic-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Magic login failed');
  }

  return res.json();
}
