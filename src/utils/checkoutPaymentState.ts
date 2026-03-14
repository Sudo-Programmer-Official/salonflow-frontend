import { computeRedeemStatus, type RedeemStatus } from './redeemStatus';

type PaymentMethod = 'cash' | 'card' | 'gift';

type PaymentOptions = {
  cash: boolean;
  card: boolean;
  gift: boolean;
};

type PaymentAmounts = {
  cash: string;
  card: string;
};

const roundMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
};

const resolveEffectiveRedeemStatus = (params: {
  redeemSelected: boolean;
  redeemStatus: RedeemStatus;
  preservedRedeemPoints: unknown;
  requiredPoints: number;
  preserveRedeemWhileLoading: boolean;
}): RedeemStatus => {
  if (!params.redeemSelected) return params.redeemStatus;
  if (params.redeemStatus.eligible) return params.redeemStatus;
  if (params.redeemStatus.reason !== 'loading' || !params.preserveRedeemWhileLoading) {
    return params.redeemStatus;
  }

  return computeRedeemStatus({
    points: params.preservedRedeemPoints,
    required: params.requiredPoints,
    isLoaded: true,
  });
};

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
  hasBillItems: boolean;
  redeemSelected: boolean;
  redeemStatus: RedeemStatus;
  preservedRedeemPoints: unknown;
  requiredPoints: number;
  redeemDollarValue: number;
  preserveRedeemWhileLoading: boolean;
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
  const redeemStatus = resolveEffectiveRedeemStatus({
    redeemSelected: params.redeemSelected,
    redeemStatus: params.redeemStatus,
    preservedRedeemPoints: params.preservedRedeemPoints,
    requiredPoints: params.requiredPoints,
    preserveRedeemWhileLoading: params.preserveRedeemWhileLoading,
  });
  const redeemValue =
    params.redeemSelected && redeemStatus.eligible
      ? Math.max(0, roundMoney(params.redeemDollarValue))
      : 0;
  const totalDue = Math.max(0, roundMoney(subtotal - redeemValue));

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
