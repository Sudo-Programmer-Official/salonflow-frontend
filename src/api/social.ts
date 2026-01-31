import { apiUrl, buildHeaders } from './client';

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function listSocialPosts(status?: string) {
  const res = await fetch(apiUrl(`/social/posts${status ? `?status=${status}` : ''}`), {
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load posts');
  return body.posts;
}

export async function createSocialDraft(input: {
  provider: string;
  destination?: 'feed' | 'story' | 'reel';
  destinations?: Array<{ platform: string; surface: string }>;
  content: string;
  mediaIds?: string[];
  scheduledAt?: string | null;
  integrationAccountId?: string | null;
}) {
  const res = await fetch(apiUrl('/social/posts'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to create draft');
  return body.post;
}

export async function publishSocialPost(id: string, provider: string) {
  const res = await fetch(apiUrl(`/social/posts/${id}/publish`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ provider }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to queue publish');
  return body;
}
