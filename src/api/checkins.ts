export type ServiceOption = {
  id: string;
  name: string;
};

export type CreateCheckInPayload = {
  name: string;
  phoneE164: string;
  serviceId?: string | null;
};

const apiBase = '/api';

export async function fetchServices(): Promise<ServiceOption[]> {
  const res = await fetch(`${apiBase}/services`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load services');
  }

  const data = await res.json();
  return (data as any[])
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: s.name }));
}

export async function createPublicCheckIn(payload: CreateCheckInPayload) {
  const res = await fetch(`${apiBase}/checkins/public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to check in');
  }

  return res.json();
}
