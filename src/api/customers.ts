import { apiUrl, buildHeaders } from '@/api/client';

export type CustomerSearchResult = {
  id: string;
  name: string;
  phoneE164: string;
  type: 'new' | 'regular' | 'vip';
  visitCount: number;
  lastVisitAt: string | null;
  lastServedBy?: string | null;
  reviewSmsConsent: boolean;
  smsConsent?: boolean;
  pointsBalance?: number | null;
  reviewSentAt?: string | null;
};

export type UpdateCustomerInput = {
  name: string;
  phoneE164?: string | null;
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

export type CustomerLoyaltySnapshot = {
  pointsBalance: number;
  vipTier: 'NEW' | 'REGULAR' | 'VIP';
};

export type CustomersResponse =
  | CustomerSearchResult[]
  | {
      items: CustomerSearchResult[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  | CustomerListResponse;

export type CustomerListSort = 'lastVisit' | 'loyaltyPoints' | 'visits' | 'name';
export type CustomerListLastVisitFilter = 'today' | '7days' | '30days' | '60days' | '90plus' | 'never';
export type CustomerListLoyaltyFilter = 'rewardAvailable' | 'closeToReward';
export type CustomerListTypeFilter = 'new' | 'regular' | 'vip';
export type CustomerListVisitsFilter = '0' | '1' | '2-5' | '5+';
export type CustomerListConsentFilter = 'optedIn' | 'notOptedIn';

export type CustomerListItem = CustomerSearchResult;

export type CustomerListResponse = {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  rewardThresholdPoints: number;
};

export async function fetchCustomers(params?: {
  segment?: 'all' | 'new' | 'regular' | 'vip';
  q?: string;
  lastVisit?: CustomerListLastVisitFilter | null;
  loyalty?: CustomerListLoyaltyFilter | null;
  customerType?: CustomerListTypeFilter | null;
  visits?: CustomerListVisitsFilter | null;
  smsConsent?: CustomerListConsentFilter | null;
  sort?: CustomerListSort | null;
  page?: number;
  limit?: number;
  pageSize?: number;
  cursor?: string | null;
}): Promise<CustomersResponse> {
  const search = new URLSearchParams();
  if (params?.segment) search.set('segment', params.segment);
  if (params?.q) search.set('q', params.q);
  if (params?.lastVisit) search.set('lastVisit', params.lastVisit);
  if (params?.loyalty) search.set('loyalty', params.loyalty);
  if (params?.customerType) search.set('customerType', params.customerType);
  if (params?.visits) search.set('visits', params.visits);
  if (params?.smsConsent) search.set('smsConsent', params.smsConsent);
  if (params?.sort) search.set('sort', params.sort);
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));
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

export async function fetchCustomerLoyalty(customerId: string): Promise<CustomerLoyaltySnapshot> {
  const res = await fetch(apiUrl(`/customers/${customerId}/loyalty`), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load loyalty');
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

export async function updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<void> {
  const res = await fetch(apiUrl(`/customers/${customerId}`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update customer');
  }
}
