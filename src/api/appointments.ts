export type AppointmentStatus = 'BOOKED' | 'CANCELED' | 'COMPLETED';

export type Appointment = {
  id: string;
  customerName: string;
  phoneE164: string;
  serviceName: string;
  staffName?: string | null;
  scheduledAt: string; // ISO
  status: AppointmentStatus;
  notes?: string | null;
  serviceId?: string;
  staffId?: string | null;
};

const apiBase = '/api/appointments';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchAppointments(params?: {
  date?: string;
  mine?: boolean;
}): Promise<Appointment[]> {
  const search = new URLSearchParams();
  if (params?.date) search.set('date', params.date);
  if (params?.mine) search.set('mine', 'true');

  const res = await fetch(`${apiBase}?${search.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load appointments');
  }
  return res.json();
}

export async function createAppointment(payload: {
  customerName: string;
  phoneE164: string;
  serviceId: string;
  staffId?: string | null;
  scheduledAt: string;
  notes?: string;
}): Promise<Appointment> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
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
  },
): Promise<Appointment> {
  const res = await fetch(`${apiBase}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
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
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
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
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
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
}) {
  const res = await fetch(`${apiBase}/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to book appointment');
  }
  return res.json();
}
