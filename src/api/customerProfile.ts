export type VipTier = 'NEW' | 'REGULAR' | 'VIP';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type CustomerProfile = {
  customer: {
    id: string;
    name: string;
    phoneE164: string;
    createdAt: string;
  };
  loyalty: {
    pointsBalance: number;
    vipTier: VipTier;
  };
};

export type LedgerEntry = {
  delta: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type RedemptionEntry = {
  ruleName: string;
  pointsSpent: number;
  createdAt: string;
};

export type RedemptionRule = {
  ruleId: string;
  name: string;
  pointsCost: number;
};

export async function fetchCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const res = await fetch(`/api/customers/${customerId}/profile`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function fetchCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
  const res = await fetch(`/api/customers/${customerId}/loyalty-ledger`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load ledger');
  const data = await res.json();
  return data.entries;
}

export async function fetchCustomerRedemptions(
  customerId: string,
): Promise<RedemptionEntry[]> {
  const res = await fetch(`/api/customers/${customerId}/redemptions`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load redemptions');
  const data = await res.json();
  return data.redemptions;
}

export async function fetchRedemptionRules(): Promise<RedemptionRule[]> {
  const res = await fetch('/api/loyalty/redemption-rules', {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to load redemption rules');
  const data = await res.json();
  return data.rules;
}

export async function redeemPoints(customerId: string, ruleId: string) {
  const res = await fetch('/api/loyalty/redemptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ customerId, ruleId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to redeem');
  }
  return res.json();
}
