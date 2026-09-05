import { describe, expect, it } from 'vitest';
import {
  reconcileSinglePaymentMethodAmount,
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
  it('reconciles an active cash allocation to 63 after redeeming 5 from a 68 bill', () => {
    const paymentOptions = { cash: true, card: false, gift: false };
    const beforeRedemption = reconcileSinglePaymentMethodAmount({
      totalDue: 68,
      paymentOptions,
      paymentAmounts: { cash: '', card: '' },
      giftCardsTotal: 0,
    });
    const afterRedemption = reconcileSinglePaymentMethodAmount({
      totalDue: 63,
      paymentOptions,
      paymentAmounts: beforeRedemption,
      giftCardsTotal: 0,
    });
    const state = resolveCheckoutPaymentState({
      subtotal: 68,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions,
      paymentAmounts: afterRedemption,
      giftCardsTotal: 0,
    });

    expect(beforeRedemption.cash).toBe('68.00');
    expect(afterRedemption.cash).toBe('63.00');
    expect(state.totalDue).toBe(63);
    expect(state.enteredTotal).toBe(63);
    expect(state.remainingBalance).toBe(0);
    expect(state.canCompleteCheckout).toBe(true);
  });

  it('does not turn a redeemed 63 total into 58 from a stale 5 cash draft', () => {
    const paymentAmounts = reconcileSinglePaymentMethodAmount({
      totalDue: 63,
      paymentOptions: { cash: true, card: false, gift: false },
      paymentAmounts: { cash: '5.00', card: '' },
      giftCardsTotal: 0,
    });
    const state = resolveCheckoutPaymentState({
      subtotal: 68,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      redeemDollarValue: 5,
      paymentOptions: { cash: true, card: false, gift: false },
      paymentAmounts,
      giftCardsTotal: 0,
    });

    expect(paymentAmounts.cash).toBe('63.00');
    expect(state.totalDue).toBe(63);
    expect(state.enteredTotal).toBe(63);
    expect(state.remainingBalance).toBe(0);
    expect(state.canCompleteCheckout).toBe(true);
  });

  it('keeps redemption toggles deterministic and preserves intentional splits', () => {
    const options = { cash: true, card: false, gift: false };
    const fullAmount = reconcileSinglePaymentMethodAmount({
      totalDue: 68,
      paymentOptions: options,
      paymentAmounts: { cash: '', card: '' },
      giftCardsTotal: 0,
    });
    const redeemedAmount = reconcileSinglePaymentMethodAmount({
      totalDue: 63,
      paymentOptions: options,
      paymentAmounts: fullAmount,
      giftCardsTotal: 0,
    });
    const restoredAmount = reconcileSinglePaymentMethodAmount({
      totalDue: 68,
      paymentOptions: options,
      paymentAmounts: redeemedAmount,
      giftCardsTotal: 0,
    });
    const redeemedAgain = reconcileSinglePaymentMethodAmount({
      totalDue: 63,
      paymentOptions: options,
      paymentAmounts: restoredAmount,
      giftCardsTotal: 0,
    });
    const split = reconcileSinglePaymentMethodAmount({
      totalDue: 63,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '30.00', card: '33.00' },
      giftCardsTotal: 0,
    });

    expect(fullAmount.cash).toBe('68.00');
    expect(redeemedAmount.cash).toBe('63.00');
    expect(restoredAmount.cash).toBe('68.00');
    expect(redeemedAgain.cash).toBe('63.00');
    expect(split).toEqual({ cash: '30.00', card: '33.00' });
  });

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
