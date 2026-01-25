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
