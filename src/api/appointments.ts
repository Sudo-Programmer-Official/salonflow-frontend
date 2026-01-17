import { apiUrl, buildHeaders } from '@/api/client';

export type AppointmentStatus = 'BOOKED' | 'CANCELED' | 'COMPLETED';

export type Appointment = {
  id: string;
  customerName: string;
  phoneE164: string;
  serviceName: string;
  staffName?: string | null;
  preferredTech?: string | null;
  scheduledAt: string; // ISO
  status: AppointmentStatus;
  notes?: string | null;
  serviceId?: string;
  staffId?: string | null;
  videoUrl?: string | null;
};

const apiBase = apiUrl('/appointments');

export type TodayAppointment = {
  id: string;
  customerName: string;
  phoneE164: string;
  serviceName: string;
  scheduledAt: string;
  staffName?: string | null;
};

export async function fetchAppointments(params?: {
  date?: string;
  mine?: boolean;
}): Promise<Appointment[]> {
  const search = new URLSearchParams();
  if (params?.date) search.set('date', params.date);
  if (params?.mine) search.set('mine', 'true');

  const res = await fetch(`${apiBase}?${search.toString()}`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load appointments');
  }
  return res.json();
}

export type TodayAppointmentsResponse =
  | { locked: true }
  | { locked?: false; items: TodayAppointment[] };

export async function fetchTodayAppointments(): Promise<TodayAppointmentsResponse> {
  const res = await fetch(`${apiBase}/today`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (res.status === 402) {
    return { locked: true };
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load today appointments');
  }
  return { items: await res.json() };
}

export async function createAppointment(payload: {
  customerName: string;
  phoneE164: string;
  serviceId: string;
  staffId?: string | null;
  scheduledAt: string;
  notes?: string;
  preferredTech?: string | null;
}): Promise<Appointment> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create appointment');
  }
  return res.json();
}

export async function updateAppointment(
  id: string,
  payload: {
    customerName: string;
    phoneE164: string;
    serviceId: string;
    staffId?: string | null;
    scheduledAt: string;
    notes?: string;
    preferredTech?: string | null;
  },
): Promise<Appointment> {
  const res = await fetch(`${apiBase}/${id}`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update appointment');
  }
  return res.json();
}

export async function cancelAppointment(id: string) {
  const res = await fetch(`${apiBase}/${id}/cancel`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel appointment');
  }
  return res.json();
}

export async function completeAppointment(id: string) {
  const res = await fetch(`${apiBase}/${id}/complete`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete appointment');
  }
  return res.json();
}

export async function createPublicAppointment(payload: {
  name: string;
  phoneE164: string;
  serviceId: string;
  scheduledAt: string;
  notes?: string;
  preferredTech?: string | null;
}) {
  const res = await fetch(`${apiBase}/public`, {
    method: 'POST',
    headers: buildHeaders({ json: true, tenant: true }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to book appointment');
  }
  return res.json();
}
