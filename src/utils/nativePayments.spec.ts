import { afterEach, describe, expect, it, vi } from 'vitest';
import { readNativePaymentStatus } from './nativePayments';

describe('readNativePaymentStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports native payments unavailable in a browser runtime', async () => {
    const status = await readNativePaymentStatus();

    expect(status.nativeAvailable).toBe(false);
    expect(status.pluginAvailable).toBe(false);
    expect(status.terminalReady).toBe(false);
  });

  it('accepts the SalonFlow DeviceStatus state from the native bridge', async () => {
    vi.stubGlobal('window', {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          SalonFlowPayments: {
            getStatus: async () => ({ state: 'READY' }),
          },
        },
      },
    });

    const status = await readNativePaymentStatus();

    expect(status.nativeAvailable).toBe(true);
    expect(status.pluginAvailable).toBe(true);
    expect(status.terminalReady).toBe(true);
  });
});
