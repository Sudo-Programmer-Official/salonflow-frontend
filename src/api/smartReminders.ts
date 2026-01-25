import { apiUrl, buildHeaders } from './client';

export type SmartReminder = {
  id: string;
  business_id: string;
  name: string;
  active: boolean;
  audience: string[];
  trigger_days: number;
  cooldown_days: number;
  channel: string[];
  message_sms: string | null;
  message_email: string | null;
  discount_type: string | null;
  discount_value: number | null;
  expiry_days: number | null;
  last_run_at: string | null;
  auto_disabled_reason: string | null;
  ai_generated?: boolean;
  ai_prompt_version?: string | null;
  created_at: string;
  updated_at: string;
};

export type SmartReminderLog = {
  id: string;
  reminder_id: string;
  business_id: string;
  customer_id: string;
  sent_at: string;
  channel: string;
  status: string;
  reason: string | null;
};

const headers = () => buildHeaders({ auth: true, json: true, tenant: true });

export type SmartReminderStats = Record<
  string,
  { sent_7d: number; skipped_7d: number; last_sent_at: string | null }
>;

export async function listReminders(): Promise<{ reminders: SmartReminder[]; stats: SmartReminderStats }> {
  const res = await fetch(apiUrl('/smart-reminders'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load reminders');
  return { reminders: body.reminders as SmartReminder[], stats: (body.stats as SmartReminderStats) || {} };
}

export async function saveReminder(payload: Partial<SmartReminder>) {
  const res = await fetch(apiUrl('/smart-reminders'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save reminder');
  return body.reminder as SmartReminder;
}

export async function toggleReminder(id: string, active: boolean) {
  const res = await fetch(apiUrl(`/smart-reminders/${id}/toggle`), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ active }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to toggle reminder');
  return body;
}

export async function fetchReminderLogs(id: string, limit = 100): Promise<SmartReminderLog[]> {
  const res = await fetch(apiUrl(`/smart-reminders/${id}/logs?limit=${limit}`), {
    headers: buildHeaders({ auth: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load logs');
  return body.logs as SmartReminderLog[];
}

export async function runRemindersNow() {
  const res = await fetch(apiUrl('/smart-reminders/run'), {
    method: 'POST',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to run reminders');
  return body;
}

export async function generateAiSuggestions(payload: {
  context: string;
  trigger: string;
  audience: string;
  channel: string;
  discount?: string | null;
  expiry?: string | null;
  tone?: string;
  short?: boolean;
  businessName?: string;
}) {
  const res = await fetch(apiUrl('/ai/message-suggestions'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to generate suggestions');
  return body.suggestions as string[];
}
