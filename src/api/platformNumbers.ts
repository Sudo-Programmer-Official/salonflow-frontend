import { apiUrl, buildHeaders } from './client';

export type PlatformNumber = {
  id: string;
  tenantId: string;
  tenantName?: string | null;
  tenantSubdomain?: string | null;
  phoneE164: string;
  provider: string | null;
  active: boolean;
  createdAt: string;
  openConversations?: number;
  lastReassignAt?: string | null;
};

export type PlatformNumberAudit = {
  id: string;
  phoneE164: string;
  fromTenantId: string | null;
  toTenantId: string | null;
  action: string;
  note?: string | null;
  actor?: string | null;
  createdAt: string;
};

export async function fetchPlatformNumbers(): Promise<{ numbers: PlatformNumber[]; audit: PlatformNumberAudit[] }> {
  const res = await fetch(apiUrl('/platform/numbers'), {
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  if (!res.ok) throw new Error('Failed to load numbers');
  return res.json();
}

export async function reassignNumber(id: string, tenantId: string, note?: string) {
  const res = await fetch(apiUrl(`/platform/numbers/${id}/reassign`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ tenantId, note }),
  });
  if (!res.ok) throw new Error('Failed to reassign number');
  return res.json();
}

export async function setNumberActive(id: string, active: boolean, note?: string) {
  const res = await fetch(apiUrl(`/platform/numbers/${id}/pause`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ active, note }),
  });
  if (!res.ok) throw new Error('Failed to update number status');
  return res.json();
}
