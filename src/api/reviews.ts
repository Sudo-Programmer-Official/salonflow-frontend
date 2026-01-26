import { apiUrl, buildHeaders } from './client';

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export type ReviewSettings = {
  enabled: boolean;
  sms_template: string | null;
  email_subject: string | null;
  email_template: string | null;
  routing_rules: any;
};

export async function fetchReviewSettings() {
  const res = await fetch(apiUrl('/reviews/settings'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load review settings');
  return body.settings as ReviewSettings;
}

export async function updateReviewSettings(input: {
  enabled: boolean;
  smsTemplate?: string;
  emailSubject?: string;
  emailTemplate?: string;
  routingRules?: any;
}) {
  const res = await fetch(apiUrl('/reviews/settings'), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      enabled: input.enabled,
      smsTemplate: input.smsTemplate,
      emailSubject: input.emailSubject,
      emailTemplate: input.emailTemplate,
      routingRules: input.routingRules,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to save review settings');
  return body.settings as ReviewSettings;
}

export type ReviewRequest = {
  id: string;
  status: string;
  channel: string;
  review_link?: string | null;
  rating?: number | null;
  sent_at?: string | null;
  clicked_at?: string | null;
  created_at: string;
  error?: string | null;
};

export async function listReviewRequests(limit = 50) {
  const res = await fetch(apiUrl(`/reviews/requests?limit=${limit}`), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load review requests');
  return body.requests as ReviewRequest[];
}

export type ReviewFeedback = {
  id: string;
  rating: number | null;
  feedback: string | null;
  locale: string | null;
  source: string | null;
  created_at: string;
};

export async function listReviewFeedback(limit = 50) {
  const res = await fetch(apiUrl(`/reviews/feedback?limit=${limit}`), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load review feedback');
  return body.feedback as ReviewFeedback[];
}

export async function sendTestReviewSms(phone: string) {
  const res = await fetch(apiUrl('/reviews/test'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to send test SMS');
  return body.request;
}
