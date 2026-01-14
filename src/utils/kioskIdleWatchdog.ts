export type WatchdogOptions = {
  softResetMs?: number;
  hardReloadMs?: number;
  onSoftReset: () => void;
};

export function startKioskIdleWatchdog({
  softResetMs = 5 * 60 * 1000,
  hardReloadMs = 10 * 60 * 1000,
  onSoftReset,
}: WatchdogOptions) {
  let lastActivity = Date.now();
  let softResetDone = false;

  const markActivity = () => {
    lastActivity = Date.now();
    softResetDone = false;
  };

  const checkIdle = () => {
    const idle = Date.now() - lastActivity;

    if (!softResetDone && idle > softResetMs) {
      softResetDone = true;
      onSoftReset();
    }

    if (idle > hardReloadMs) {
      window.location.reload();
    }
  };

  const events: Array<keyof WindowEventMap> = ['touchstart', 'mousedown', 'keydown'];
  events.forEach((eventName) => window.addEventListener(eventName, markActivity));

  const handleVisibility = () => {
    if (!document.hidden) {
      onSoftReset();
      markActivity();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const interval = window.setInterval(checkIdle, 30000);

  return () => {
    clearInterval(interval);
    events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
