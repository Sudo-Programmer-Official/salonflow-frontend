import { apiUrl, buildHeaders } from './client';

export type SmsSegment = 'all' | 'new' | 'regular' | 'vip';

export type CustomerSummary = {
  id: string;
  name: string;
  phoneE164: string;
};

export async function fetchCustomersBySegment(
  segment: SmsSegment,
): Promise<CustomerSummary[]> {
  const res = await fetch(apiUrl(`/customers?segment=${segment}`), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load customers');
  }

  return res.json();
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
