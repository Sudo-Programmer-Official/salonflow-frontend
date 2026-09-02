import { computeRedeemStatus, type RedeemStatus } from './redeemStatus';

export function resolveCheckoutRedeemState(params: {
  authoritativePoints: unknown;
  required: number;
  isAuthoritativeLoaded: boolean;
  isAuthoritativeLoading: boolean;
}): { points: number; redeemStatus: RedeemStatus } {
  const points = params.isAuthoritativeLoaded
    ? params.authoritativePoints
    : undefined;

  const redeemStatus = computeRedeemStatus({
    points,
    required: params.required,
    isLoaded: params.isAuthoritativeLoaded && !params.isAuthoritativeLoading,
  });

  return {
    points: redeemStatus.points,
    redeemStatus,
  };
}
