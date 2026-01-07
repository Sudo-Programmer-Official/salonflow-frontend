import { apiUrl, buildHeaders } from '@/api/client';

export type CustomerSearchResult = {
  id: string;
  name: string;
  phoneE164: string;
  type: 'new' | 'regular' | 'vip';
  visitCount: number;
  lastVisitAt: string | null;
  reviewSmsConsent: boolean;
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

export async function fetchCustomers(segment: 'all' | 'new' | 'regular' | 'vip' = 'all'): Promise<CustomerSearchResult[]> {
  const search = new URLSearchParams();
  if (segment) search.set('segment', segment);
  const res = await fetch(apiUrl(`/customers?${search.toString()}`), {
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
