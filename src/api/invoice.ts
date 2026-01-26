import { apiUrl, buildHeaders } from './client';

export type InvoiceEstimate = {
  month: string;
  plan: string;
  currency: string;
  total: number;
  lines: Array<{ description: string; amount: number; type: string; detail?: string }>;
};

export async function fetchInvoicePreview() {
  const res = await fetch(apiUrl('/growth/invoice/preview'), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load invoice');
  return body.estimate as InvoiceEstimate;
}
