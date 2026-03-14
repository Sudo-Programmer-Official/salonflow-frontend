import { describe, expect, it } from 'vitest';
import { resolveCheckoutRedeemState } from './checkoutLoyalty';

describe('resolveCheckoutRedeemState', () => {
  it('allows first-attempt redemption when the authoritative balance is loaded and sufficient', () => {
    const state = resolveCheckoutRedeemState({
      fallbackPoints: 0,
      authoritativePoints: 320,
      required: 300,
      isAuthoritativeLoaded: true,
      isAuthoritativeLoading: false,
    });

    expect(state.points).toBe(320);
    expect(state.redeemStatus).toEqual({
      eligible: true,
      reason: 'ready',
      points: 320,
      required: 300,
    });
  });

  it('blocks redemption when the authoritative balance is below the threshold', () => {
    const state = resolveCheckoutRedeemState({
      fallbackPoints: 999,
      authoritativePoints: 250,
      required: 300,
      isAuthoritativeLoaded: true,
      isAuthoritativeLoading: false,
    });

    expect(state.points).toBe(250);
    expect(state.redeemStatus.eligible).toBe(false);
    expect(state.redeemStatus.reason).toBe('insufficient-points');
  });

  it('keeps redemption in loading state while the authoritative balance is still being fetched', () => {
    const state = resolveCheckoutRedeemState({
      fallbackPoints: 320,
      authoritativePoints: undefined,
      required: 300,
      isAuthoritativeLoaded: false,
      isAuthoritativeLoading: true,
    });

    expect(state.points).toBe(320);
    expect(state.redeemStatus.eligible).toBe(false);
    expect(state.redeemStatus.reason).toBe('loading');
  });

  it('uses the authoritative balance instead of stale queue points once loaded', () => {
    const state = resolveCheckoutRedeemState({
      fallbackPoints: 0,
      authoritativePoints: 305,
      required: 300,
      isAuthoritativeLoaded: true,
      isAuthoritativeLoading: false,
    });

    expect(state.points).toBe(305);
    expect(state.redeemStatus.eligible).toBe(true);
  });
});
