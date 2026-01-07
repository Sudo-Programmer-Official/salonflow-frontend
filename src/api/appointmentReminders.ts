import { apiUrl, buildHeaders } from '@/api/client';

const apiBase = apiUrl('/appointment-reminders/settings');

export type ReminderSettings = {
  enabled: boolean;
  send24h: boolean;
  send2h: boolean;
};

export async function fetchReminderSettings(): Promise<ReminderSettings> {
  const res = await fetch(apiBase, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load reminder settings');
  }
  return res.json();
}

export async function updateReminderSettings(settings: ReminderSettings): Promise<ReminderSettings> {
  const res = await fetch(apiBase, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save reminder settings');
  }
  return res.json();
}
