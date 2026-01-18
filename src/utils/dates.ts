import dayjsLib from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjsLib.extend(utc);
dayjsLib.extend(timezone);

export const DEFAULT_TIMEZONE = 'America/Chicago';
export const BUSINESS_TZ_KEY = 'businessTimezone';

export function setBusinessTimezone(tz?: string | null) {
  if (typeof window === 'undefined') return;
  const value = tz?.trim();
  if (value) {
    localStorage.setItem(BUSINESS_TZ_KEY, value);
  }
}

export function getBusinessTimezone(): string {
  if (typeof window === 'undefined') return DEFAULT_TIMEZONE;
  const stored = localStorage.getItem(BUSINESS_TZ_KEY);
  return stored?.trim() || DEFAULT_TIMEZONE;
}

export function formatInBusinessTz(
  iso: string | null | undefined,
  format = 'MMM D, YYYY h:mm A',
  tz?: string,
): string {
  if (!iso) return '—';
  const zone = tz?.trim() || getBusinessTimezone();
  const d = zone ? dayjsLib(iso).tz(zone) : dayjsLib(iso);
  return d.isValid() ? d.format(format) : '—';
}

export function nowInBusinessTz(tz?: string) {
  const zone = tz?.trim() || getBusinessTimezone();
  return zone ? dayjsLib().tz(zone) : dayjsLib();
}

export const dayjs = dayjsLib;
