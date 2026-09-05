import { type RedeemStatus } from './redeemStatus';

export type PaymentMethod = 'cash' | 'card' | 'gift';

export type PaymentOptions = {
  cash: boolean;
  card: boolean;
  gift: boolean;
};

export type PaymentAmounts = {
  cash: string;
  card: string;
};

const roundMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
};

/**
 * Resolve the amount for a newly activated payment method from the canonical
 * payable total. The method being activated is deliberately excluded from
 * existing allocations so a stale draft amount cannot be subtracted twice.
 */
export function resolvePaymentMethodAmount(params: {
  totalDue: unknown;
  method: Exclude<PaymentMethod, 'gift'>;
  paymentOptions: PaymentOptions;
  paymentAmounts: PaymentAmounts;
  giftCardsTotal: unknown;
}): string {
  const totalDue = Math.max(0, roundMoney(params.totalDue));
  const otherPaymentTotal = (['cash', 'card'] as const).reduce((sum, method) => {
    if (method === params.method || !params.paymentOptions[method]) return sum;
    return sum + roundMoney(params.paymentAmounts[method]);
  }, 0);
  const giftCardTotal = params.paymentOptions.gift
    ? roundMoney(params.giftCardsTotal)
    : 0;
  const remaining = Math.max(0, roundMoney(totalDue - otherPaymentTotal - giftCardTotal));
  return remaining > 0 ? remaining.toFixed(2) : '';
}

export function shouldClearRedeemSelection(params: {
  redeemSelected: boolean;
  redeemStatus: RedeemStatus;
}): boolean {
  if (!params.redeemSelected) return false;
  return (
    params.redeemStatus.reason === 'insufficient-points' ||
    params.redeemStatus.reason === 'invalid-values'
  );
}

export function resolveCheckoutPaymentState(params: {
  subtotal: unknown;
  discountValue?: unknown;
  taxValue?: unknown;
  tipValue?: unknown;
  hasBillItems: boolean;
  redeemSelected: boolean;
  redeemStatus: RedeemStatus;
  redeemDollarValue: number;
  paymentOptions: PaymentOptions;
  paymentAmounts: PaymentAmounts;
  giftCardsTotal: unknown;
}): {
  redeemStatus: RedeemStatus;
  redeemValue: number;
  totalDue: number;
  enteredPayments: Array<{ method: PaymentMethod; amount: number }>;
  enteredTotal: number;
  remainingBalance: number;
  remainingState: 'due' | 'paid' | 'over';
  canCompleteCheckout: boolean;
} {
  const subtotal = Math.max(0, roundMoney(params.subtotal));
  const discountValue = Math.min(subtotal, Math.max(0, roundMoney(params.discountValue)));
  const taxValue = Math.max(0, roundMoney(params.taxValue));
  const tipValue = Math.max(0, roundMoney(params.tipValue));
  // The customer loyalty endpoint is authoritative. Do not reconstruct a
  // redeemable balance from queue or cached customer data.
  const redeemStatus = params.redeemStatus;
  const redeemValue =
    params.redeemSelected && redeemStatus.eligible
      ? Math.max(0, roundMoney(params.redeemDollarValue))
      : 0;
  const totalDue = Math.max(0, roundMoney(subtotal - discountValue + taxValue + tipValue - redeemValue));

  const enteredPayments: Array<{ method: PaymentMethod; amount: number }> = [];
  (['cash', 'card'] as const).forEach((method) => {
    if (!params.paymentOptions[method]) return;
    const amount = roundMoney(params.paymentAmounts[method]);
    if (amount >= 0) {
      enteredPayments.push({ method, amount });
    }
  });

  const giftCardsTotal = roundMoney(params.giftCardsTotal);
  if (params.paymentOptions.gift && giftCardsTotal > 0) {
    enteredPayments.push({ method: 'gift', amount: giftCardsTotal });
  }

  const enteredTotal = roundMoney(
    enteredPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const remainingBalance = roundMoney(totalDue - enteredTotal);

  return {
    redeemStatus,
    redeemValue,
    totalDue,
    enteredPayments,
    enteredTotal,
    remainingBalance,
    remainingState:
      remainingBalance > 0.009
        ? 'due'
        : remainingBalance < -0.009
          ? 'over'
          : 'paid',
    canCompleteCheckout:
      params.hasBillItems &&
      enteredPayments.length > 0 &&
      Math.abs(remainingBalance) < 0.01,
  };
}
