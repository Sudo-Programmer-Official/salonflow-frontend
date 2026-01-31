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

// --- Meta (Facebook/Instagram) ---

export async function facebookConnect() {
  const res = await fetch(apiUrl('/integrations/facebook/connect'), {
    method: 'GET',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to start Facebook connect');
  return body as { url: string; state: string };
}

export async function facebookCallback(code: string, state: string) {
  const res = await fetch(apiUrl(`/integrations/facebook/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`), {
    method: 'GET',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to complete Facebook callback');
  return body as { pages: Array<{ page_id: string; page_name: string; has_instagram: boolean }>; session: string; state: string };
}

export async function facebookSelectPage(input: { page_id: string; session: string; state: string }) {
  const res = await fetch(apiUrl('/integrations/facebook/select-page'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save page selection');
  return body;
}

export async function facebookStatus() {
  const res = await fetch(apiUrl('/integrations/facebook/status'), {
    method: 'GET',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to fetch Facebook status');
  return body as { connected: boolean; account?: { id: string; display_name: string | null; status: string; last_error: string | null; meta: any } };
}

// --- Google Business Reviews ---

export async function fetchGoogleReviews() {
  const res = await fetch(apiUrl('/integrations/google-business/reviews'), {
    method: 'GET',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load reviews');
  return body.reviews;
}

export async function aiDraftGoogleReviewReply(id: string) {
  const res = await fetch(apiUrl(`/integrations/google-business/reviews/${id}/ai-draft`), {
    method: 'POST',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to draft reply');
  return body.draft as string;
}

export async function sendGoogleReviewReply(id: string, reply: string) {
  const res = await fetch(apiUrl(`/integrations/google-business/reviews/${id}/reply`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reply }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to send reply');
  return body;
}

export async function updateGoogleBusinessSettings(input: {
  autoPullReviews?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyMinRating?: number;
}) {
  const res = await fetch(apiUrl('/integrations/google-business/settings'), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update settings');
  return body.account;
}

export async function googleBusinessStatus() {
  const res = await fetch(apiUrl('/integrations/google-business/status'), {
    method: 'GET',
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to fetch status');
  return body as { connected: boolean; account?: { status: string; last_error: string | null; meta: any; display_name: string | null } };
}
