import { apiUrl, buildHeaders } from '@/api/client';

const apiBase = apiUrl('/review-sms');

export async function fetchReviewSmsSettings(): Promise<{ enabled: boolean; reviewLink: string | null }> {
  const res = await fetch(`${apiBase}/settings`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load settings');
  }
  return res.json();
}

export async function updateReviewSmsSettings(enabled: boolean, reviewLink: string | null) {
  const res = await fetch(`${apiBase}/settings`, {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ enabled, reviewLink }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update settings');
  }
  return res.json();
}

export async function fetchReviewQr(): Promise<{ reviewLink: string; qrDataUrl: string }> {
  const res = await fetch(apiUrl('/review/qr'), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load review QR');
  }
  return res.json();
}
