export type RedeemStatusReason = 'loading' | 'invalid-values' | 'insufficient-points' | 'ready';

export type RedeemStatus =
  | { eligible: true; reason: 'ready'; points: number; required: number }
  | { eligible: false; reason: Exclude<RedeemStatusReason, 'ready'>; points: number; required: number };

export function computeRedeemStatus(params: { points: unknown; required: number; isLoaded: boolean }): RedeemStatus {
  const parsed = Number(params.points ?? 0);
  if (!Number.isFinite(parsed)) {
    return { eligible: false, reason: 'invalid-values', points: 0, required: params.required };
  }

  const points = Math.max(0, Math.floor(parsed));

  if (!params.isLoaded) {
    return { eligible: false, reason: 'loading', points, required: params.required };
  }

  if (points < params.required) {
    return { eligible: false, reason: 'insufficient-points', points, required: params.required };
  }

  return { eligible: true, reason: 'ready', points, required: params.required };
}
