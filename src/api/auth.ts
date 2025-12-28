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

export async function login(input: { email: string; password: string }): Promise<LoginResponse> {
  const tenantId =
    (import.meta.env.VITE_TENANT_ID as string | undefined) ||
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? undefined : undefined);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenantId) headers['x-tenant-id'] = tenantId;

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
