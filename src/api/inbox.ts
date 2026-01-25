import { apiUrl, buildHeaders } from './client';

export type Conversation = {
  id: string;
  status: 'open' | 'closed';
  channel: 'sms' | 'email';
  lastMessageAt: string;
  unreadCount: number;
  lastMessagePreview?: string | null;
  customerId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
};

export type Message = {
  direction: 'inbound' | 'outbound';
  body: string;
  from: string;
  to: string;
  status: 'received' | 'sent' | 'delivered' | 'failed';
  provider: string;
  providerMessageId?: string | null;
  created_at: string;
};

export async function fetchConversations(status: 'open' | 'closed' = 'open', channel: 'sms' | 'email' | 'all' = 'all') {
  const channelParam = channel === 'all' ? '' : `&channel=${channel}`;
  const res = await fetch(apiUrl(`/inbox/conversations?status=${status}${channelParam}`), {
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  if (!res.ok) throw new Error('Failed to load conversations');
  return (await res.json()) as Conversation[];
}

export async function fetchMessages(conversationId: string) {
  const res = await fetch(apiUrl(`/inbox/conversations/${conversationId}/messages`), {
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  if (!res.ok) throw new Error('Failed to load messages');
  const data = await res.json();
  return data as { conversation: Conversation; messages: Message[] };
}

export async function replyToConversation(conversationId: string, message: string) {
  const res = await fetch(apiUrl(`/inbox/conversations/${conversationId}/reply`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.message || 'Failed to send reply');
    err.code = data?.code;
    throw err;
  }
  return data as { ok: true; sid?: string; status?: string };
}

export async function closeConversation(conversationId: string) {
  const res = await fetch(apiUrl(`/inbox/conversations/${conversationId}/close`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  if (!res.ok) throw new Error('Failed to close conversation');
  return res.json();
}

export async function markConversationRead(conversationId: string) {
  await fetch(apiUrl(`/inbox/conversations/${conversationId}/mark-read`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true }),
  });
}

export async function fetchUnreadCount() {
  const res = await fetch(apiUrl('/inbox/unread-count'), {
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  if (!res.ok) throw new Error('Failed to load unread count');
  const data = await res.json();
  return typeof data?.count === 'number' ? data.count : 0;
}
