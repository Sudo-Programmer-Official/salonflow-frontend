export type NativePaymentStatus = {
  nativeAvailable: boolean;
  pluginAvailable: boolean;
  terminalReady: boolean;
  provider?: string | null;
  deviceId?: string | null;
  message: string;
};

type NativePaymentPlugin = {
  getStatus?: () => Promise<{
    ready?: boolean;
    state?: string;
    status?: string;
    provider?: string | null;
    deviceId?: string | null;
    message?: string;
    error?: { message?: string } | null;
  }>;
};

type NativePaymentWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      SalonFlowPayments?: NativePaymentPlugin;
    };
  };
};

export const browserNativePaymentStatus = (): NativePaymentStatus => ({
  nativeAvailable: false,
  pluginAvailable: false,
  terminalReady: false,
  provider: null,
  deviceId: null,
  message: 'Browser/PWA mode — native terminal unavailable.',
});

export async function readNativePaymentStatus(): Promise<NativePaymentStatus> {
  if (typeof window === 'undefined') return browserNativePaymentStatus();

  const nativeWindow = window as NativePaymentWindow;
  const capacitor = nativeWindow.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return browserNativePaymentStatus();

  const plugin = capacitor.Plugins?.SalonFlowPayments;
  if (!plugin) {
    return {
      nativeAvailable: false,
      pluginAvailable: false,
      terminalReady: false,
      provider: null,
      deviceId: null,
      message: 'Capacitor shell detected, but the SalonFlow payment bridge is not installed.',
    };
  }

  try {
    const status = await plugin.getStatus?.();
    const terminalReady =
      status?.ready === true ||
      status?.state?.trim().toUpperCase() === 'READY' ||
      status?.status?.trim().toUpperCase() === 'READY';

    return {
      nativeAvailable: true,
      pluginAvailable: true,
      terminalReady,
      provider: status?.provider ?? null,
      deviceId: status?.deviceId ?? null,
      message: terminalReady
        ? 'Native payment bridge is available and the terminal is ready.'
        : status?.message ||
          status?.error?.message ||
          'Native payment bridge is available; terminal is not ready.',
    };
  } catch {
    return {
      nativeAvailable: true,
      pluginAvailable: true,
      terminalReady: false,
      provider: null,
      deviceId: null,
      message: 'Native payment bridge could not check terminal readiness.',
    };
  }
}
