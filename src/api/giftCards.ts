import { apiUrl, buildHeaders } from './client';

export type GiftCard = {
  id: string;
  businessId: string;
  number: string;
  balance: number;
  soldAt: string | null;
  source: 'new' | 'legacy';
  status?: 'active' | 'depleted';
};

const baseUrl = apiUrl('/gift-cards');

const handle = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || fallback);
  }
  return res.json();
};

export async function fetchGiftCard(number: string): Promise<GiftCard> {
  const res = await fetch(`${baseUrl}/${encodeURIComponent(number)}`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return handle<GiftCard>(res, 'Failed to fetch gift card');
}

export async function sellGiftCard(payload: { number: string; amount: number }): Promise<GiftCard> {
  const res = await fetch(`${baseUrl}/sell`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });
  return handle<GiftCard>(res, 'Failed to sell gift card');
}

export async function addLegacyGiftCard(payload: { number: string; amount: number }): Promise<GiftCard> {
  const res = await fetch(`${baseUrl}/legacy`, {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(payload),
  });
  return handle<GiftCard>(res, 'Failed to add legacy gift card');
}
