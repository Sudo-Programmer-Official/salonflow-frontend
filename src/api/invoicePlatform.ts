import { apiUrl, buildHeaders } from './client';
import type { InvoiceEstimate } from './invoice';

export async function fetchPlatformInvoicePreview(businessId: string) {
  const res = await fetch(apiUrl(`/platform/growth/invoice/${businessId}`), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load invoice');
  return body.estimate as InvoiceEstimate;
}
