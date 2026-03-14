import { describe, expect, it } from 'vitest';
import { resolveCheckoutPaymentState, shouldClearRedeemSelection } from './checkoutPaymentState';
import type { RedeemStatus } from './redeemStatus';

const readyStatus: RedeemStatus = {
  eligible: true,
  reason: 'ready',
  points: 587,
  required: 300,
};

describe('resolveCheckoutPaymentState', () => {
  it('reduces the total immediately when redeem is selected', () => {
    const state = resolveCheckoutPaymentState({
      subtotal: 100,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      preservedRedeemPoints: 587,
      requiredPoints: 300,
      redeemDollarValue: 5,
      preserveRedeemWhileLoading: false,
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
      preservedRedeemPoints: 587,
      requiredPoints: 300,
      redeemDollarValue: 5,
      preserveRedeemWhileLoading: false,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '90.00', card: '5.00' },
      giftCardsTotal: 0,
    });
    const invalid = resolveCheckoutPaymentState({
      subtotal: 100,
      hasBillItems: true,
      redeemSelected: true,
      redeemStatus: readyStatus,
      preservedRedeemPoints: 587,
      requiredPoints: 300,
      redeemDollarValue: 5,
      preserveRedeemWhileLoading: false,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '95.00', card: '5.00' },
      giftCardsTotal: 0,
    });

    expect(valid.remainingBalance).toBe(0);
    expect(valid.canCompleteCheckout).toBe(true);
    expect(invalid.remainingBalance).toBe(-5);
    expect(invalid.canCompleteCheckout).toBe(false);
  });

  it('keeps redeem applied through the first-attempt loyalty refresh in custom total mode', () => {
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
      preservedRedeemPoints: 587,
      requiredPoints: 300,
      redeemDollarValue: 5,
      preserveRedeemWhileLoading: true,
      paymentOptions: { cash: true, card: true, gift: false },
      paymentAmounts: { cash: '90.00', card: '5.00' },
      giftCardsTotal: 0,
    });

    expect(state.redeemStatus).toEqual(readyStatus);
    expect(state.totalDue).toBe(95);
    expect(state.remainingBalance).toBe(0);
    expect(state.canCompleteCheckout).toBe(true);
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
