import { describe, it, expect } from 'vitest';
import { computeRedeemStatus } from './redeemStatus';

describe('computeRedeemStatus', () => {
  it('is eligible when points meet the requirement exactly', () => {
    const status = computeRedeemStatus({ points: 300, required: 300, isLoaded: true });
    expect(status).toEqual({ eligible: true, reason: 'ready', points: 300, required: 300 });
  });

  it('floors fractional points and reports insufficient when below the threshold', () => {
    const status = computeRedeemStatus({ points: 299.9, required: 300, isLoaded: true });
    expect(status.eligible).toBe(false);
    expect(status.reason).toBe('insufficient-points');
    expect(status.points).toBe(299);
  });

  it('returns loading status until loyalty data is available', () => {
    const status = computeRedeemStatus({ points: 320, required: 300, isLoaded: false });
    expect(status.eligible).toBe(false);
    expect(status.reason).toBe('loading');
  });

  it('treats non-numeric input as invalid', () => {
    const status = computeRedeemStatus({ points: 'abc', required: 300, isLoaded: true });
    expect(status.eligible).toBe(false);
    expect(status.reason).toBe('invalid-values');
    expect(status.points).toBe(0);
  });
});
