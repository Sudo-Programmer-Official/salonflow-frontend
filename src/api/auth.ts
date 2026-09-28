import { buildHeaders } from './client';
import { isPlatformHost, tenantFromHost } from '../utils/tenantDomains';
import {
  clearNativeRefreshToken,
  getNativeInstallationInfo,
  getNativeRefreshToken,
  isNativeRuntime,
  setNativeRefreshToken,
} from '../utils/nativeRuntime';

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
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  accessTokenExpiresAt?: string;
  device?: { id: string };
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

export async function login(
  input: { email: string; password: string },
  options: { client?: 'salonflow_admin' | 'salonflow_pos' } = {},
): Promise<LoginResponse> {
  const host = typeof window !== 'undefined' ? window.location.host : undefined;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const hostnameTenant = tenantFromHost(host);
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
  const platformHost = isPlatformHost(host);
  if (client === 'salonflow_pos') headers['x-pos-client'] = 'true';
  if (tenantId && !platformHost) headers['x-tenant-id'] = tenantId;
  if (platformHost) {
    headers['x-platform-login'] = 'true';
  }
  if (tenantId && typeof window !== 'undefined' && !platformHost) {
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('tenantSubdomain', tenantId);
  }

  let nativeDevice;
  if (isNativeRuntime()) {
    nativeDevice = await getNativeInstallationInfo();
    if (!nativeDevice) {
      throw new Error('Native installation identity is unavailable. Please restart the SalonFlow app.');
    }
    headers['x-salonflow-native'] = 'true';
  }

  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...input, ...(nativeDevice ? { nativeDevice } : {}) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid credentials');
  }

  const result = await res.json();
  if (isNativeRuntime()) {
    if (!result.refreshToken) {
      throw new Error('Native sign-in did not establish a secure session');
    }
    await setNativeRefreshToken(result.refreshToken);
    if (result.device?.id) localStorage.setItem('salonflow:nativeDeviceId', result.device.id);
  }
  localStorage.removeItem('demoAccessSession');
  localStorage.removeItem('demoProspectName');
  localStorage.removeItem('demoProspectBusinessName');
  localStorage.removeItem('demoTemplateLabel');
  localStorage.removeItem('demoTemplateKey');
  return result;
}

const persistRefreshedAuth = (result: LoginResponse) => {
  localStorage.setItem('token', result.token);
  localStorage.setItem('role', result.user.role);
  localStorage.setItem('tenantId', result.user.businessId);
  localStorage.setItem('client', result.user.client || 'salonflow_admin');
  if (result.user.email) localStorage.setItem('email', result.user.email);
  if (result.device?.id) localStorage.setItem('salonflow:nativeDeviceId', result.device.id);
};

export async function refreshNativeSession(): Promise<LoginResponse | null> {
  if (!isNativeRuntime()) return null;
  const refreshToken = await getNativeRefreshToken();
  if (!refreshToken) return null;
  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-salonflow-native': 'true' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (_error) {
    return null;
  }
  if (!res.ok) {
    await clearNativeRefreshToken().catch(() => undefined);
    return null;
  }
  const result = await res.json() as LoginResponse;
  if (!result.refreshToken) {
    await clearNativeRefreshToken().catch(() => undefined);
    return null;
  }
  await setNativeRefreshToken(result.refreshToken);
  persistRefreshedAuth(result);
  return result;
}

export async function restoreNativeSession(): Promise<boolean> {
  if (!isNativeRuntime()) return Boolean(localStorage.getItem('token'));
  const token = localStorage.getItem('token');
  const tokenExpired = token ? (() => {
    try {
      const encoded = token.split('.')[1];
      if (!encoded) return true;
      const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const payload = JSON.parse(atob(padded));
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch (_error) {
      return true;
    }
  })() : true;
  if (!tokenExpired && localStorage.getItem('role')) return true;
  const result = await refreshNativeSession();
  if (!result) {
    ['token', 'role', 'client', 'email', 'salonflow:nativeDeviceId'].forEach((key) =>
      localStorage.removeItem(key),
    );
  }
  return Boolean(result?.token && result.user?.role);
}

export async function revokeNativeSession(): Promise<void> {
  if (!isNativeRuntime()) return;
  const refreshToken = await getNativeRefreshToken().catch(() => null);
  if (refreshToken) {
    await fetch(`${apiBase}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-salonflow-native': 'true' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearNativeRefreshToken().catch(() => undefined);
}

export async function magicLogin(token: string): Promise<LoginResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let nativeDevice;
  if (isNativeRuntime()) {
    nativeDevice = await getNativeInstallationInfo();
    if (!nativeDevice) throw new Error('Native installation identity is unavailable');
    headers['x-salonflow-native'] = 'true';
  }
  const res = await fetch(`${apiBase}/api/auth/magic-login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, ...(nativeDevice ? { nativeDevice } : {}) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Magic login failed');
  }

  const result = await res.json();
  if (isNativeRuntime()) {
    if (!result.refreshToken) throw new Error('Native sign-in did not establish a secure session');
    await setNativeRefreshToken(result.refreshToken);
    if (result.device?.id) localStorage.setItem('salonflow:nativeDeviceId', result.device.id);
  }
  localStorage.removeItem('demoAccessSession');
  localStorage.removeItem('demoProspectName');
  localStorage.removeItem('demoProspectBusinessName');
  localStorage.removeItem('demoTemplateLabel');
  localStorage.removeItem('demoTemplateKey');
  return result;
}

export async function fetchCurrentAccount(): Promise<CurrentAccountResponse> {
  const res = await fetch(`${apiBase}/api/auth/me`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
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
