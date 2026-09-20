import { apiUrl, buildHeaders, readJsonResponse } from './client';

export async function getDemoAccessConfig(): Promise<{ enabled: boolean }> {
  const response = await fetch(apiUrl('/demo/access/config'));
  const payload = await readJsonResponse<{ enabled?: boolean }>(response, {});
  return { enabled: response.ok && payload.enabled === true };
}

export type DemoAccessExchangeResponse = {
  token: string;
  expiresAt: string;
  tenantSubdomain: string;
  demoContext?: {
    prospectName?: string | null;
    businessName?: string | null;
    templateKey: string;
    templateLabel: string;
  };
  user: {
    id: string;
    businessId: string;
    role: 'OWNER' | 'STAFF' | 'CUSTOMER';
    client: 'salonflow_admin' | 'salonflow_pos';
    permissions: string[];
  };
};

export async function exchangeDemoAccess(rawToken: string): Promise<DemoAccessExchangeResponse> {
  const response = await fetch(apiUrl('/demo/access/exchange'), {
    method: 'POST',
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ token: rawToken }),
  });
  const payload = await readJsonResponse<{ error?: string } & DemoAccessExchangeResponse>(
    response,
    {} as { error?: string } & DemoAccessExchangeResponse,
  );
  if (!response.ok) {
    throw new Error(payload.error || 'This demo access link is no longer available.');
  }
  return payload;
}
