import { apiUrl, buildHeaders } from './client';

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function fetchGrowthPlan() {
  const res = await fetch(apiUrl('/growth/plan'), { headers: headers() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load plan');
  return body as {
    plan: string;
    features: Array<{
      feature_key: string;
      enabled: boolean;
      quota: number | null;
      expires_at: string | null;
    }>;
    usage: Array<{ metric_key: string; count: number }>;
    trial_expires_at: string | null;
  };
}

export async function requestGrowthUpgrade(plan_key: string) {
  const res = await fetch(apiUrl('/growth/upgrade-request'), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ plan_key }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to request upgrade');
  return body;
}
