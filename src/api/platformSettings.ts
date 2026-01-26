import { apiUrl, buildHeaders } from './client';

export async function fetchPlatformAlertEmails() {
  const res = await fetch(apiUrl('/platform/settings/alerts'), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load alert emails');
  return body.emails as string[];
}

export async function savePlatformAlertEmails(emails: string) {
  const res = await fetch(apiUrl('/platform/settings/alerts'), {
    method: 'PUT',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify({ emails }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save alert emails');
  return body.emails as string[];
}
