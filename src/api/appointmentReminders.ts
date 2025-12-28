const apiBase = '/api/appointment-reminders/settings';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type ReminderSettings = {
  enabled: boolean;
  send24h: boolean;
  send2h: boolean;
};

export async function fetchReminderSettings(): Promise<ReminderSettings> {
  const res = await fetch(apiBase, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load reminder settings');
  }
  return res.json();
}

export async function updateReminderSettings(settings: ReminderSettings): Promise<ReminderSettings> {
  const res = await fetch(apiBase, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save reminder settings');
  }
  return res.json();
}
