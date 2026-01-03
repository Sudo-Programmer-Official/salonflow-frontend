import { apiUrl, buildHeaders } from './client';

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
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

export async function updateStaffStatus(
  staffId: string,
  status: 'active' | 'inactive',
) {
  const res = await fetch(`${apiBase}/${staffId}/status`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update staff');
  }
  return res.json();
}
