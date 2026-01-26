import { apiUrl, buildHeaders } from './client';

const headers = () => buildHeaders({ auth: true, json: true });

export async function listUpgradeRequests() {
  const res = await fetch(apiUrl('/platform/upgrade-requests'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load upgrade requests');
  return body.requests as any[];
}

export async function approveUpgradeRequest(id: string) {
  const res = await fetch(apiUrl(`/platform/upgrade-requests/${id}/approve`), {
    method: 'POST',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to approve');
  return body;
}

export async function rejectUpgradeRequest(id: string) {
  const res = await fetch(apiUrl(`/platform/upgrade-requests/${id}/reject`), {
    method: 'POST',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to reject');
  return body;
}
