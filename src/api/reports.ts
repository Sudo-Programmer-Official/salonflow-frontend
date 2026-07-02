import { apiUrl, buildHeaders } from './client';

export type DateRange = { from: string; to: string };
export type ReportSource = 'all' | 'admin_checkout' | 'pos';

export type SalesReportResponse = {
  range: DateRange;
  source: ReportSource;
  summary: {
    grossSales: number;
    netSales: number;
    serviceRevenue: number;
    productRevenue: number;
    discounts: number;
    tax: number;
    tips: number;
    refunds: number;
    closedTickets: number;
    unassignedSales: number;
  };
  payments: {
    cash: number;
    card: number;
    giftCard: number;
    check: number;
    other: number;
  };
  staff: Array<{
    staffId: string | null;
    staffName: string;
    serviceRevenue: number;
    tips: number;
    ticketCount: number;
  }>;
  tips: Array<{
    staffId: string | null;
    staffName: string;
    tips: number;
  }>;
  services: Array<{
    serviceName: string;
    quantity: number;
    revenue: number;
    staffName: string | null;
  }>;
};

export async function fetchSalesReport(params?: {
  from?: string;
  to?: string;
  source?: ReportSource;
}): Promise<SalesReportResponse> {
  const url = new URL(apiUrl('/reports'), window.location.origin);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  if (params?.source) url.searchParams.set('source', params.source);
  const res = await fetch(url.toString(), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load reports');
  }
  return res.json();
}
