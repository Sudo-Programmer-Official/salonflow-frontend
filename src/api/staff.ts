export type StaffMember = {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
};

const apiBase = '/api/staff';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch(apiBase, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load staff');
  }
  return res.json();
}

export async function updateStaffStatus(
  staffId: string,
  status: 'active' | 'inactive',
) {
  const res = await fetch(`${apiBase}/${staffId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update staff');
  }
  return res.json();
}
