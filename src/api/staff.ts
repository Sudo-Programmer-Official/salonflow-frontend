import { apiUrl, buildHeaders } from '@/api/client';

export type StaffMember = {
  id: string;
  name: string;
  nickname: string | null;
  phoneE164: string | null;
  active: boolean;
};

const apiBase = apiUrl('/staff');

export async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch(apiBase, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load staff');
  }
  return res.json();
}

export async function createStaff(input: {
  name: string;
  nickname?: string;
  phoneE164?: string;
  active?: boolean;
}): Promise<StaffMember> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create staff');
  }
  return res.json();
}

export async function updateStaffStatus(
  staffId: string,
  active: boolean,
) {
  const res = await fetch(`${apiBase}/${staffId}`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update staff');
  }
  return res.json();
}
