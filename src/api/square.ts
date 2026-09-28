import { apiUrl, buildHeaders } from './client';

export type SquareConnection = {
  accountId: string;
  businessId: string;
  environment: 'sandbox' | 'production';
  merchantId: string;
  expiresAt: string | null;
  locationId: string | null;
  locationName: string | null;
  defaultDeviceId: string | null;
  status: string;
  connected: boolean;
};

export type SquareDevice = {
  id: string;
  businessId: string;
  provider: string;
  providerDeviceId: string;
  locationId: string | null;
  displayName: string | null;
  status: string;
  pairedAt: string | null;
  lastSeenAt: string | null;
  isDefault: boolean;
};

const handleResponse = async <T>(res: Response, fallback: string): Promise<T> => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || fallback);
  return body as T;
};

export async function fetchSquareStatus(): Promise<{ connection: SquareConnection | null; devices: SquareDevice[] }> {
  const response = await fetch(apiUrl('/integrations/square/status'), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return handleResponse(response, 'Failed to load Square status');
}

export async function authorizeSquare(): Promise<{ url: string }> {
  const response = await fetch(apiUrl('/integrations/square/authorize'), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return handleResponse(response, 'Failed to start Square connection');
}

export async function createSquareDeviceCode(name = 'SalonFlow Front Desk') {
  const response = await fetch(apiUrl('/integrations/square/device-code'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ name }),
  });
  return handleResponse<{ deviceCode: { code: string | null; pairBy: string | null; status: string } }>(response, 'Failed to create Square device code');
}

export async function syncSquareDevices() {
  const response = await fetch(apiUrl('/integrations/square/devices/sync'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return handleResponse<{ devices: SquareDevice[] }>(response, 'Failed to sync Square devices');
}

export async function testSquareConnection() {
  const response = await fetch(apiUrl('/integrations/square/test'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return handleResponse<{ ready: boolean; locationCount: number; devices: SquareDevice[] }>(response, 'Square connection test failed');
}
