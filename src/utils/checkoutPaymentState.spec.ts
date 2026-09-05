import { describe, expect, it } from 'vitest';
import {
  resolveCheckoutPaymentState,
  resolvePaymentMethodAmount,
  shouldClearRedeemSelection,
} from './checkoutPaymentState';
import type { RedeemStatus } from './redeemStatus';

const readyStatus: RedeemStatus = {
  eligible: true,
  reason: 'ready',
  points: 587,
  required: 300,
};

describe('resolveCheckoutPaymentState', () => {
  it('allocates the full redeemed payable total instead of subtracting a stale method amount', () => {
    const cashAmount = resolvePaymentMethodAmount({
      totalDue: 198,
      method: 'cash',
      paymentOptions: { cash: true, card: false, gift: false },
      paymentAmounts: { cash: '5.00', card: '' },
      giftCardsTotal: 0,
    });

    const state = resolveCheckoutPaymentState({
      subtotal: 203,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: false, gift: false },
      paymentAmounts: { cash: cashAmount, card: '' },
      giftCardsTotal: 0,
    });

    expect(cashAmount).toBe('198.00');
    expect(state.totalDue).toBe(198);
    expect(state.enteredTotal).toBe(198);
    expect(state.remainingBalance).toBe(0);
    expect(state.canCompleteCheckout).toBe(true);
  });

  it('uses only other allocations when switching payment methods', () => {
    const cardAmount = resolvePaymentMethodAmount({
      totalDue: 198,
      method: 'card',
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '100.00', card: '5.00' },
      giftCardsTotal: 0,
    });
    const cashAmount = resolvePaymentMethodAmount({
      totalDue: 198,
      method: 'cash',
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '193.00', card: '' },
      giftCardsTotal: 0,
    });

    expect(cardAmount).toBe('98.00');
    expect(cashAmount).toBe('198.00');
  });

  it('keeps the undiscounted total and supports an intentional split payment', () => {
    const noRedemption = resolveCheckoutPaymentState({
      subtotal: 203,
      hasBillItems: true,
      redeemSelected: false,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: false, gift: false },
      paymentAmounts: { cash: '203.00', card: '' },
      giftCardsTotal: 0,
    });
    const split = resolveCheckoutPaymentState({
      subtotal: 203,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '100.00', card: '98.00' },
      giftCardsTotal: 0,
    });

    expect(noRedemption.totalDue).toBe(203);
    expect(noRedemption.remainingBalance).toBe(0);
    expect(noRedemption.canCompleteCheckout).toBe(true);
    expect(split.totalDue).toBe(198);
    expect(split.enteredTotal).toBe(198);
    expect(split.remainingBalance).toBe(0);
    expect(split.canCompleteCheckout).toBe(true);
  });

  it('reduces the total immediately when redeem is selected', () => {
    const state = resolveCheckoutPaymentState({
      subtotal: 100,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: false, gift: false },
      paymentAmounts: { cash: '95.00', card: '' },
      giftCardsTotal: 0,
    });

    expect(state.redeemValue).toBe(5);
    expect(state.totalDue).toBe(95);
  });

  it('recomputes remaining and validates payments against the redeemed total', () => {
    const valid = resolveCheckoutPaymentState({
      subtotal: 100,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '90.00', card: '5.00' },
      giftCardsTotal: 0,
    });
    const invalid = resolveCheckoutPaymentState({
      subtotal: 100,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '95.00', card: '5.00' },
      giftCardsTotal: 0,
    });

    expect(valid.remainingBalance).toBe(0);
    expect(valid.canCompleteCheckout).toBe(true);
    expect(invalid.remainingBalance).toBe(-5);
    expect(invalid.canCompleteCheckout).toBe(false);
  });

  it('does not apply a stale redeem balance while the loyalty API is loading', () => {
    const state = resolveCheckoutPaymentState({
      subtotal: 100,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: {
        eligible: false,
        reason: 'loading',
        points: 587,
        required: 300,
      },
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '90.00', card: '5.00' },
      giftCardsTotal: 0,
    });

    expect(state.redeemStatus.reason).toBe('loading');
    expect(state.redeemValue).toBe(0);
    expect(state.totalDue).toBe(100);
    expect(state.remainingBalance).toBe(5);
    expect(state.canCompleteCheckout).toBe(false);
  });
});

describe('shouldClearRedeemSelection', () => {
  it('does not clear redeem while loyalty is refreshing', () => {
    expect(
      shouldClearRedeemSelection({
        redeemSelected: true,
        redeemStatus: {
          eligible: false,
          reason: 'loading',
          points: 587,
          required: 300,
        },
      }),
    ).toBe(false);
  });

  it('clears redeem after a definitive insufficient-points result', () => {
    expect(
      shouldClearRedeemSelection({
        redeemSelected: true,
        redeemStatus: {
          eligible: false,
          reason: 'insufficient-points',
          points: 250,
          required: 300,
        },
      }),
    ).toBe(true);
  });
});
