import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerNativeDevice } from './nativeDevices';

const storage = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

describe('registerNativeDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not let a browser register as native hardware', async () => {
    const browserStorage = storage({ token: 'browser-token', tenantSubdomain: 'mtvnails' });
    vi.stubGlobal('window', {
      location: { host: 'mtvnails.salonflow.studio', hostname: 'mtvnails.salonflow.studio' },
      localStorage: browserStorage,
      Capacitor: { isNativePlatform: () => false },
    });
    vi.stubGlobal('localStorage', browserStorage);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(registerNativeDevice()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registers a native installation using the explicit bridge identity', async () => {
    const nativeStorage = storage({ token: 'native-token', tenantSubdomain: 'mtvnails' });
    vi.stubGlobal('window', {
      location: { host: 'localhost', hostname: 'localhost' },
      localStorage: nativeStorage,
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          SalonFlowNative: {
            getInstallationInfo: async () => ({
              installationId: 'ios-installation-1',
              platform: 'ios',
              appVersion: '1.0.0',
            }),
          },
          SalonFlowPayments: {
            getStatus: async () => ({ state: 'NOT_CONFIGURED' }),
          },
        },
      },
    });
    vi.stubGlobal('localStorage', nativeStorage);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'device-1', installationId: 'ios-installation-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await registerNativeDevice();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/devices/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer native-token' }),
        body: expect.stringContaining('ios-installation-1'),
      }),
    );
  });
});
