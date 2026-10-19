import { apiUrl, buildHeaders } from './client';
import { readNativePaymentStatus } from '../utils/nativePayments';
import { getNativeInstallationInfo, isNativeRuntime } from '../utils/nativeRuntime';

export type RegisteredNativeDevice = {
  id: string;
  businessId: string;
  installationId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  capabilities: Record<string, unknown>;
  paymentProvider: string | null;
  terminalId: string | null;
  lastUserId: string | null;
  lastSeenAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const hasAuthenticatedSession = () =>
  typeof window !== 'undefined' && Boolean(localStorage.getItem('token'));

/**
 * Registers only native installations. The device record is metadata and
 * revocation state; it is never an authentication credential.
 */
export async function registerNativeDevice(): Promise<RegisteredNativeDevice | null> {
  if (!isNativeRuntime() || !hasAuthenticatedSession()) return null;

  const installation = await getNativeInstallationInfo();
  if (!installation) return null;

  const paymentStatus = await readNativePaymentStatus();
  const response = await fetch(apiUrl('/devices/register'), {
    method: 'POST',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify({
      ...installation,
      capabilities: {
        payments: {
          state: paymentStatus.terminalReady ? 'READY' : 'NOT_CONFIGURED',
          provider: paymentStatus.provider ?? null,
          deviceId: paymentStatus.deviceId ?? null,
          error: paymentStatus.message ? { message: paymentStatus.message } : null,
        },
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 423) {
    throw new Error(body.error || 'Failed to register native device');
  }
  if (body?.id && typeof window !== 'undefined') {
    localStorage.setItem('salonflow:nativeDeviceId', body.id);
  }
  return body as RegisteredNativeDevice;
}
