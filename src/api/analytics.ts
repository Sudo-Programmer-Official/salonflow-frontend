import { apiUrl, buildHeaders } from './client';

export type DateRange = { from: string; to: string };

export type SummaryResponse = {
  range: DateRange;
  customersTotal: number;
  customersNew: number;
  checkins: number;
  servicesSelected: number;
  pointsIssued: number;
  activeStaff: number;
};

export type CheckinsTrendPoint = { date: string; new: number; returning: number; total: number };

export type ServicesResponse = {
  range: DateRange;
  services: Array<{ serviceName: string; categoryName: string; count: number }>;
  categories: Array<{ categoryName: string; count: number }>;
};

export type PeakHourPoint = { hour: number; count: number };

export type StaffSnapshot = {
  range: DateRange;
  staff: Array<{ staffId: string; staffName: string; checkouts: number; customers: number }>;
};

export type CustomerSnapshot = {
  range: DateRange;
  totalCustomers: number;
  avgVisitsPerCustomer: number;
  lastVisitBuckets: Record<string, number>;
};

const headers = () => buildHeaders({ auth: true, tenant: true, json: true });

export async function fetchAnalyticsSummary(params?: { from?: string; to?: string }): Promise<SummaryResponse> {
  const url = new URL(apiUrl('/analytics/summary'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('Failed to load analytics summary');
  return res.json();
}

export async function fetchCheckinsTrend(params?: { from?: string; to?: string }) {
  const url = new URL(apiUrl('/analytics/checkins'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('Failed to load check-in trend');
  return res.json() as Promise<{ range: DateRange; points: CheckinsTrendPoint[] }>;
}

export async function fetchServicesAnalytics(params?: { from?: string; to?: string }) {
  const url = new URL(apiUrl('/analytics/services'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('Failed to load services analytics');
  return res.json() as Promise<ServicesResponse>;
}

export async function fetchPeakHours(params?: { from?: string; to?: string }) {
  const url = new URL(apiUrl('/analytics/peak-hours'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('Failed to load peak hours');
  return res.json() as Promise<{ range: DateRange; points: PeakHourPoint[] }>;
}

export async function fetchStaffAnalytics(params?: { from?: string; to?: string }) {
  const url = new URL(apiUrl('/analytics/staff'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('Failed to load staff analytics');
  return res.json() as Promise<StaffSnapshot>;
}

export async function fetchCustomerAnalytics(params?: { from?: string; to?: string }) {
  const url = new URL(apiUrl('/analytics/customers'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('Failed to load customer analytics');
  return res.json() as Promise<CustomerSnapshot>;
}
