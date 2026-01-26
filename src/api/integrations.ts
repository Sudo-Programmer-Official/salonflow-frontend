import { apiUrl, buildHeaders } from './client';

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function connectGoogleBusiness(payload: {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  profile_name?: string;
  profile_id?: string;
  scopes?: string[];
}) {
  const res = await fetch(apiUrl('/integrations/google-business/connect'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to connect Google Business');
  return body.account;
}

export async function pullGoogleBusiness() {
  const res = await fetch(apiUrl('/integrations/google-business/pull'), {
    method: 'POST',
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Failed to enqueue pull');
  }
  return true;
}

export async function syncGoogleBusiness() {
  const res = await fetch(apiUrl('/integrations/google-business/sync'), {
    method: 'POST',
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Failed to enqueue sync');
  }
  return true;
}
