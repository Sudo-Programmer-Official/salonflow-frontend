import { apiUrl, buildHeaders } from './client';

export type NotificationTemplate = {
  id: string;
  business_id: string;
  event: 'checkin' | 'service_started' | 'checkout' | 'review_request';
  channel: 'sms';
  enabled: boolean;
  body: string;
  updated_at: string;
};

export type NotificationSettings = {
  id: string;
  business_id: string;
  notify_via_sms: boolean;
  notify_via_email: boolean;
  notify_in_app: boolean;
  sms_numbers: string[];
  email_addresses: string[];
  updated_at: string;
};

export type NotificationFeedItem = {
  id: string;
  type: string;
  message: string;
  metadata: Record<string, any> | null;
  read: boolean;
  created_at: string;
};

const headers = () => buildHeaders({ auth: true, json: true, tenant: true });

export async function listNotificationTemplates(): Promise<NotificationTemplate[]> {
  const res = await fetch(apiUrl('/notifications/templates'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load notification templates');
  return (body.templates ?? []) as NotificationTemplate[];
}

export async function updateNotificationTemplate(
  id: string,
  payload: Partial<Pick<NotificationTemplate, 'body' | 'enabled'>>,
): Promise<NotificationTemplate> {
  const res = await fetch(apiUrl(`/notifications/templates/${id}`), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update template');
  return body.template as NotificationTemplate;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await fetch(apiUrl('/notifications/settings'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load notification settings');
  return body.settings as NotificationSettings;
}

export async function updateNotificationSettings(payload: {
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
  notifyInApp?: boolean;
  smsNumbers?: string[];
  emailAddresses?: string[];
}): Promise<NotificationSettings> {
  const res = await fetch(apiUrl('/notifications/settings'), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save notification settings');
  return body.settings as NotificationSettings;
}

export async function listNotificationFeed(params?: {
  unread?: boolean;
  limit?: number;
}): Promise<NotificationFeedItem[]> {
  const search = new URLSearchParams();
  if (params?.unread) search.set('unread', 'true');
  if (params?.limit) search.set('limit', String(params.limit));
  const res = await fetch(apiUrl(`/notifications/feed?${search.toString()}`), {
    headers: headers(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load notifications');
  return body.items as NotificationFeedItem[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/notifications/${id}/read`), {
    method: 'POST',
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to mark notification read');
  }
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch(apiUrl('/notifications/unread-count'), {
    headers: headers(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to load unread count');
  return Number(body.unreadCount ?? 0);
}
