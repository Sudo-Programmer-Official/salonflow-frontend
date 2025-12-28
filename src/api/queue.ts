export type QueueItem = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  staffName: string | null;
  status: 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELED';
};

const apiBase = '/api';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

export async function fetchQueue(): Promise<QueueItem[]> {
  const res = await fetch(`${apiBase}/checkins/queue`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load queue');
  }

  return res.json();
}

export async function assignToMe(checkInId: string) {
  const res = await fetch(`${apiBase}/checkins/${checkInId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign');
  }

  return res.json();
}

export async function startCheckIn(checkInId: string) {
  const res = await fetch(`${apiBase}/checkins/${checkInId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start service');
  }

  return res.json();
}

export async function completeCheckIn(checkInId: string) {
  const res = await fetch(`${apiBase}/checkins/${checkInId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete');
  }

  return res.json();
}
