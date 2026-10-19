export type NativeInstallationInfo = {
  installationId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber?: string | null;
  deviceModel?: string | null;
  osVersion?: string | null;
};

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
  Plugins?: {
    SalonFlowNative?: {
      getInstallationInfo?: () => Promise<NativeInstallationInfo>;
      getRefreshToken?: () => Promise<{ refreshToken?: string | null }>;
      setRefreshToken?: (input: { token: string }) => Promise<void>;
      clearRefreshToken?: () => Promise<void>;
    };
  };
};

type NativeWindow = Window & { Capacitor?: CapacitorRuntime };

export const getCapacitorRuntime = (): CapacitorRuntime | null => {
  if (typeof window === 'undefined') return null;
  const capacitor = (window as NativeWindow).Capacitor;
  return capacitor?.isNativePlatform?.() === true ? capacitor : null;
};

export const isNativeRuntime = () => Boolean(getCapacitorRuntime());

export const getNativeInstallationInfo = async (): Promise<NativeInstallationInfo | null> => {
  const capacitor = getCapacitorRuntime();
  const getInstallationInfo = capacitor?.Plugins?.SalonFlowNative?.getInstallationInfo;
  if (!getInstallationInfo) return null;

  const result = await getInstallationInfo();
  if (!result?.installationId || !result.appVersion) return null;
  if (result.platform !== 'ios' && result.platform !== 'android') return null;
  return result;
};

const getNativePlugin = () => getCapacitorRuntime()?.Plugins?.SalonFlowNative;

export const getNativeRefreshToken = async (): Promise<string | null> => {
  const getter = getNativePlugin()?.getRefreshToken;
  if (!getter) return null;
  const result = await getter();
  return typeof result?.refreshToken === 'string' && result.refreshToken.length > 0
    ? result.refreshToken
    : null;
};

export const setNativeRefreshToken = async (token: string): Promise<void> => {
  const setter = getNativePlugin()?.setRefreshToken;
  if (!setter) throw new Error('Native secure session storage is unavailable');
  await setter({ token });
};

export const clearNativeRefreshToken = async (): Promise<void> => {
  const clearer = getNativePlugin()?.clearRefreshToken;
  if (clearer) await clearer();
};
