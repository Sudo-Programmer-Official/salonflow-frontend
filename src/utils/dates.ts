import dayjsLib from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjsLib.extend(utc);
dayjsLib.extend(timezone);
dayjsLib.extend(relativeTime);

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

export function isWithinTcpaWindow(
  instant?: string | number | Date,
  tz?: string,
  startHour = 8,
  endHour = 20,
): boolean {
  const zone = tz?.trim() || getBusinessTimezone();
  const d = instant ? dayjsLib(instant) : dayjsLib();
  const local = zone ? d.tz(zone) : d;
  if (!local.isValid()) return false;
  const hour = local.hour();
  const minute = local.minute();
  const afterStart = hour > startHour || (hour === startHour && minute >= 0);
  const beforeEnd = hour < endHour;
  return afterStart && beforeEnd;
}

export const dayjs = dayjsLib;

export function humanizeTime(date: string | number | Date | null | undefined): string {
  if (!date) return '—';
  const d = dayjsLib(date);
  return d.isValid() ? d.fromNow() : '—';
}
