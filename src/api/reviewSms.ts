const apiBase = '/api/review-sms';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchReviewSmsSettings(): Promise<{ enabled: boolean }> {
  const res = await fetch(`${apiBase}/settings`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load settings');
  }
  return res.json();
}

export async function updateReviewSmsSettings(enabled: boolean) {
  const res = await fetch(`${apiBase}/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update settings');
  }
  return res.json();
}
