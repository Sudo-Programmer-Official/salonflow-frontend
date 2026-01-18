import { apiUrl, buildHeaders } from '@/api/client';

export type StaffMember = {
  id: string;
  name: string;
  nickname: string | null;
  phoneE164: string | null;
  active: boolean;
};

const apiBase = apiUrl('/staff');

export type AvailabilityEntry = {
  id: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  active: boolean;
  sortOrder: number;
};

export type AvailabilityOverride = {
  id: string;
  date: string;
  isClosed: boolean;
  startLocalTime: string | null;
  endLocalTime: string | null;
  active: boolean;
};

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

export async function fetchStaffServices(staffId: string): Promise<string[]> {
  const res = await fetch(`${apiBase}/${staffId}/services`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load staff services');
  }
  const data = await res.json();
  return data.serviceIds ?? [];
}

export async function assignStaffServices(staffId: string, serviceIds: string[]): Promise<string[]> {
  const res = await fetch(`${apiBase}/${staffId}/services`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ serviceIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update staff services');
  }
  const data = await res.json();
  return data.serviceIds ?? [];
}

export async function fetchAvailability(staffId: string): Promise<AvailabilityEntry[]> {
  const res = await fetch(apiUrl(`/staff/${staffId}/availability`), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load availability');
  }
  return res.json();
}

export async function saveAvailability(staffId: string, entries: Omit<AvailabilityEntry, 'id'>[]): Promise<AvailabilityEntry[]> {
  const res = await fetch(apiUrl(`/staff/${staffId}/availability`), {
    method: 'PUT',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save availability');
  }
  return res.json();
}

export async function fetchAvailabilityOverrides(
  staffId: string,
  from?: string,
  to?: string,
): Promise<AvailabilityOverride[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const url = params.toString()
    ? apiUrl(`/staff/${staffId}/availability/overrides?${params.toString()}`)
    : apiUrl(`/staff/${staffId}/availability/overrides`);
  const res = await fetch(url, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load overrides');
  }
  return res.json();
}

export async function saveAvailabilityOverride(
  staffId: string,
  input: {
    id?: string;
    date: string;
    isClosed: boolean;
    startLocalTime?: string | null;
    endLocalTime?: string | null;
    active?: boolean;
  },
): Promise<AvailabilityOverride> {
  const url = input.id
    ? apiUrl(`/staff/availability/overrides/${input.id}`)
    : apiUrl(`/staff/${staffId}/availability/overrides`);
  const method = input.id ? 'PATCH' : 'POST';
  const res = await fetch(url, {
    method,
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ ...input }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save override');
  }
  return res.json();
}
