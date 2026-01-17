import { apiUrl, buildHeaders } from '@/api/client';

export type CustomerSearchResult = {
  id: string;
  name: string;
  phoneE164: string;
  type: 'new' | 'regular' | 'vip';
  visitCount: number;
  lastVisitAt: string | null;
  reviewSmsConsent: boolean;
  pointsBalance?: number | null;
  reviewSentAt?: string | null;
};

export type CustomerTimelineVisit = {
  paidAt: string | null;
  amountPaid: number | null;
  servedByName: string | null;
  reviewSent: boolean;
};

export type CustomerTimeline = {
  customer: {
    id: string;
    name: string;
    phoneE164: string;
    pointsBalance?: number | null;
  };
  visits: CustomerTimelineVisit[];
};

export type CustomersResponse =
  | CustomerSearchResult[]
  | {
      items: CustomerSearchResult[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export async function fetchCustomers(params?: {
  segment?: 'all' | 'new' | 'regular' | 'vip';
  limit?: number;
  cursor?: string | null;
}): Promise<CustomersResponse> {
  const search = new URLSearchParams();
  if (params?.segment) search.set('segment', params.segment);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.cursor) search.set('cursor', params.cursor);
  const query = search.toString();
  const url = query ? apiUrl(`/customers?${query}`) : apiUrl('/customers');
  const res = await fetch(url, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load customers');
  }
  return res.json();
}

export async function searchCustomers(term: string): Promise<CustomerSearchResult[]> {
  const url = apiUrl(`/customers/search?q=${encodeURIComponent(term)}`);
  const res = await fetch(url, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to search customers');
  }

  return res.json();
}

export async function fetchCustomerTimeline(customerId: string): Promise<CustomerTimeline> {
  const res = await fetch(apiUrl(`/customers/${customerId}/timeline`), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load timeline');
  }

  return res.json();
}

export async function sendCustomerReminder(customerId: string): Promise<void> {
  const res = await fetch(apiUrl(`/customers/${customerId}/reminder`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send reminder');
  }
}

export async function sendCustomerFeedback(customerId: string): Promise<void> {
  const res = await fetch(apiUrl(`/customers/${customerId}/feedback`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send feedback');
  }
}
