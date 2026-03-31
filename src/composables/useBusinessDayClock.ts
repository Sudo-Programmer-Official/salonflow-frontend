import { readonly, ref } from 'vue';

import { dayjs, getBusinessTimezone } from '../utils/dates';

const currentDayKey = ref('');
let started = false;
let dayRolloverId: number | null = null;

const getBusinessNow = () => dayjs().tz(getBusinessTimezone());
const computeDayKey = () => getBusinessNow().format('YYYY-MM-DD');

const clearDayRolloverRefresh = () => {
  if (dayRolloverId !== null && typeof window !== 'undefined') {
    window.clearTimeout(dayRolloverId);
    dayRolloverId = null;
  }
};

const scheduleDayRolloverRefresh = () => {
  if (typeof window === 'undefined') {
    return;
  }

  clearDayRolloverRefresh();

  const now = getBusinessNow();
  const delayMs = Math.max(now.add(1, 'day').startOf('day').diff(now), 1_000);

  dayRolloverId = window.setTimeout(() => {
    dayRolloverId = null;
    currentDayKey.value = computeDayKey();
    scheduleDayRolloverRefresh();
  }, delayMs + 50);
};

const syncCurrentDayKey = () => {
  const nextDayKey = computeDayKey();
  const changed = currentDayKey.value !== nextDayKey;
  currentDayKey.value = nextDayKey;
  scheduleDayRolloverRefresh();
  return changed;
};

const ensureStarted = () => {
  if (started || typeof window === 'undefined') {
    return;
  }

  started = true;
  currentDayKey.value = computeDayKey();
  scheduleDayRolloverRefresh();

  const syncOnResume = () => {
    syncCurrentDayKey();
  };

  window.addEventListener('focus', syncOnResume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncOnResume();
    }
  });
};

export const refreshBusinessDayClock = () => {
  ensureStarted();
  return syncCurrentDayKey();
};

export const useBusinessDayClock = () => {
  ensureStarted();

  return {
    currentDayKey: readonly(currentDayKey),
    refreshDayBoundary: refreshBusinessDayClock,
  };
};
