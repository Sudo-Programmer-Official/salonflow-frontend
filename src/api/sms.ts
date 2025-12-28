export type SmsSegment = 'all' | 'new' | 'regular' | 'vip';

export type CustomerSummary = {
  id: string;
  name: string;
  phoneE164: string;
};

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchCustomersBySegment(
  segment: SmsSegment,
): Promise<CustomerSummary[]> {
  const res = await fetch(`/api/customers?segment=${segment}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load customers');
  }

  return res.json();
}

export async function sendSms(payload: {
  segment: SmsSegment;
  message: string;
  consentConfirmed: boolean;
}) {
  const res = await fetch('/api/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send SMS');
  }

  return res.json();
}
