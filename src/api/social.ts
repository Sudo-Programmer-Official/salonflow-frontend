import { apiUrl, buildHeaders } from './client';

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function listSocialPosts(params?: { status?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));
  const res = await fetch(apiUrl(`/social/posts${search.toString() ? `?${search.toString()}` : ''}`), {
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load posts');
  return body as { posts: any[]; pagination?: { total: number; page: number; pageSize: number; pages: number } };
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
