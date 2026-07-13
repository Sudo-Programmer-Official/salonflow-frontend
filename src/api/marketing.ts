import { apiUrl, buildHeaders, readJsonResponse } from '@/api/client';

export type MarketingEventType =
  | 'page_view'
  | 'cta_click'
  | 'request_start'
  | 'request_submit'
  | 'demo_sent'
  | 'demo_activated'
  | 'demo_converted';

export async function trackMarketingEvent(input: {
  eventType: MarketingEventType;
  sourcePage?: string | null;
  path?: string | null;
  referrer?: string | null;
  demoRequestId?: string | null;
  templateKey?: string | null;
  payload?: Record<string, any>;
}) {
  try {
    const res = await fetch(apiUrl('/public/marketing/events'), {
      method: 'POST',
      headers: buildHeaders({ json: true }),
      body: JSON.stringify({
        event_type: input.eventType,
        source_page: input.sourcePage ?? null,
        path: input.path ?? null,
        referrer: input.referrer ?? null,
        demo_request_id: input.demoRequestId ?? null,
        template_key: input.templateKey ?? null,
        payload: input.payload ?? {},
      }),
      keepalive: true,
    });
    if (!res.ok && res.status !== 204) {
      return;
    }
  } catch {
    // fire-and-forget
  }
}

export type MarketingFunnelSummary = {
  range: { days: number };
  stages: Array<{ key: string; label: string; count: number }>;
  recent: Array<{
    eventType: string;
    sourcePage: string | null;
    path: string | null;
    referrer: string | null;
    templateKey: string | null;
    occurredAt: string;
  }>;
  totals: {
    pageViews: number;
    ctaClicks: number;
    requestStarts: number;
    requestSubmits: number;
    demosSent: number;
    demosActivated: number;
    demosConverted: number;
  };
};

export async function fetchMarketingFunnelSummary(days = 30): Promise<MarketingFunnelSummary> {
  const res = await fetch(apiUrl(`/platform/marketing/funnel?days=${days}`), {
    headers: buildHeaders({ auth: true }),
  });
  const body = await readJsonResponse(res, {} as MarketingFunnelSummary & { error?: string });
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load marketing funnel');
  }
  return body;
}
