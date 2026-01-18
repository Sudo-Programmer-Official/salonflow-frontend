import { apiUrl, buildHeaders } from '@/api/client';

export type SmsSegment = 'all' | 'new' | 'regular' | 'vip';

export async function fetchSmsRecipientsCount(segment: SmsSegment): Promise<number> {
  const res = await fetch(apiUrl(`/sms/recipients?segment=${segment}`), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load SMS recipients');
  }

  const data = await res.json();
  return typeof data.count === 'number' ? data.count : 0;
}

export async function sendSms(payload: {
  segment: SmsSegment;
  message: string;
  consentConfirmed: boolean;
}) {
  const res = await fetch(apiUrl('/sms/send'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send SMS');
  }

  return res.json();
}
