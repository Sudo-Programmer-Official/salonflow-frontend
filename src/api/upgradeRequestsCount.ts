import { apiUrl, buildHeaders } from './client';

export async function fetchUpgradeRequestCount() {
  const res = await fetch(apiUrl('/platform/upgrade-requests/count?status=pending'), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load count');
  return body.count as number;
}
