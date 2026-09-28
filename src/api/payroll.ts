import { apiUrl, buildHeaders } from './client';

export type PayrollStaffSummary = {
  staffId: string;
  staffName: string;
  serviceCount: number;
  serviceRevenue: number;
  serviceEarnings: number;
  tips: number;
  adjustments: number;
  totalPay: number;
};

export type PayrollSummaryResponse = {
  range: { from: string; to: string };
  status: 'draft';
  summary: {
    serviceCount: number;
    serviceRevenue: number;
    serviceEarnings: number;
    tips: number;
    adjustments: number;
    totalPay: number;
    unassignedServiceCount: number;
  };
  staff: PayrollStaffSummary[];
  unassigned: Array<{
    id: string;
    checkoutId: string;
    checkinId: string | null;
    serviceName: string;
    grossAmount: number;
    tipAmount: number;
    performedAt: string;
  }>;
};

export type PayrollCompensation = {
  staffId: string;
  staffName: string;
  commissionType: 'percentage' | 'fixed' | 'hourly';
  commissionValue: number;
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders({ auth: true, tenant: true, json: true }),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Payroll request failed');
  }
  return res.json();
};

export async function fetchPayroll(params: { from: string; to: string }): Promise<PayrollSummaryResponse> {
  const url = new URL(apiUrl('/payroll'), window.location.origin);
  url.searchParams.set('from', params.from);
  url.searchParams.set('to', params.to);
  return request<PayrollSummaryResponse>(url.toString());
}

export function fetchPayrollCompensation(): Promise<PayrollCompensation[]> {
  return request<PayrollCompensation[]>(apiUrl('/payroll/compensation'));
}

export function savePayrollCompensation(
  staffId: string,
  input: Pick<PayrollCompensation, 'commissionType' | 'commissionValue'>,
): Promise<Pick<PayrollCompensation, 'staffId' | 'commissionType' | 'commissionValue'>> {
  return request(apiUrl(`/payroll/compensation/${staffId}`), {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
