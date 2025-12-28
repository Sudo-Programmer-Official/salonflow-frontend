export type ServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  points: number;
  isActive: boolean;
};

const apiBase = '/api/services';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchServices(): Promise<ServiceItem[]> {
  const res = await fetch(apiBase, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load services');
  }
  return res.json();
}

export async function createService(input: {
  name: string;
  durationMinutes: number;
  points?: number;
}): Promise<ServiceItem> {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create service');
  }
  return res.json();
}

export async function updateServiceStatus(serviceId: string, isActive: boolean) {
  const res = await fetch(`${apiBase}/${serviceId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update status');
  }
  return res.json();
}
