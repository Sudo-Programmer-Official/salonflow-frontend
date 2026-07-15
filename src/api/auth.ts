import { buildHeaders } from './client';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    businessId: string;
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'CUSTOMER';
    client: 'salonflow_admin' | 'salonflow_pos';
    permissions: string[];
    email?: string;
    passwordChangedAt?: string | null;
  };
};

type CurrentAccountResponse = {
  user: {
    id: string;
    businessId: string;
    role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'CUSTOMER';
    client: 'salonflow_admin' | 'salonflow_pos';
    permissions: string[];
    email?: string;
    passwordChangedAt?: string | null;
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

export async function login(
  input: { email: string; password: string },
  options: { client?: 'salonflow_admin' | 'salonflow_pos' } = {},
): Promise<LoginResponse> {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const hostnameTenant = hostname ? hostname.split('.')[0] ?? undefined : undefined;
  const isLocal = hostname ? hostname.includes('localhost') : false;
  const tenantId =
    (isLocal ? (import.meta.env.VITE_TENANT_ID as string | undefined) : undefined) ||
    (isLocal ? (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) : undefined) ||
    (isLocal ? (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined) : undefined) ||
    hostnameTenant ||
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSubdomain') ?? undefined : undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const client = options.client ?? 'salonflow_admin';
  const platformHost = isPlatformHost();
  if (client === 'salonflow_pos') headers['x-pos-client'] = 'true';
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

export async function fetchCurrentAccount(): Promise<CurrentAccountResponse> {
  const res = await fetch(`${apiBase}/api/auth/me`, {
    headers: buildHeaders({ auth: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load account');
  }

  return res.json();
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{ ok: true; passwordChangedAt?: string | null }> {
  const res = await fetch(`${apiBase}/api/auth/change-password`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to change password');
  }

  return res.json();
}

export async function requestPasswordReset(input: {
  email: string;
  tenantHint?: string | null;
}): Promise<{ message: string }> {
  const res = await fetch(`${apiBase}/api/auth/forgot-password`, {
    method: 'POST',
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send password reset email');
  }

  return res.json();
}

export async function sendPasswordResetEmail(): Promise<{ message: string }> {
  const res = await fetch(`${apiBase}/api/auth/send-password-reset-email`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send password reset email');
  }

  return res.json();
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{ ok: true }> {
  const res = await fetch(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset password');
  }

  return res.json();
}
