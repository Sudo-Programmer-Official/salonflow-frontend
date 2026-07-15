const TWENTY_FOUR_HOUR = /^(\d{1,2}):(\d{2})$/;
const TWELVE_HOUR = /^(\d{1,2}):(\d{2})\s*([ap]m)$/i;

const pad = (value: number) => String(value).padStart(2, '0');

export const BUSINESS_TIME_STORAGE_FORMAT = 'HH:mm';
export const BUSINESS_TIME_DISPLAY_FORMAT = 'hh:mm A';

export function parseBusinessTime(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const twentyFour = TWENTY_FOUR_HOUR.exec(raw);
  if (twentyFour) {
    const hours = Number(twentyFour[1]);
    const minutes = Number(twentyFour[2]);
    if (!Number.isInteger(hours) || hours < 0 || hours > 23) return null;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
    return `${pad(hours)}:${pad(minutes)}`;
  }

  const twelve = TWELVE_HOUR.exec(raw);
  if (twelve) {
    let hours = Number(twelve[1]);
    const minutes = Number(twelve[2]);
    const meridiem = (twelve[3] || '').toUpperCase();
    if (!Number.isInteger(hours) || hours < 1 || hours > 12) return null;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null;
    if (meridiem === 'AM') {
      hours = hours === 12 ? 0 : hours;
    } else if (meridiem === 'PM') {
      hours = hours === 12 ? 12 : hours + 12;
    } else {
      return null;
    }
    return `${pad(hours)}:${pad(minutes)}`;
  }

  return null;
}

export function formatBusinessTime(value?: string | null, fallback = ''): string {
  const normalized = parseBusinessTime(value);
  if (!normalized) return fallback;

  const [hoursRaw, minutes] = normalized.split(':');
  const hours = Number(hoursRaw);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return fallback;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

export function formatBusinessHoursRange(
  open?: string | null,
  close?: string | null,
  fallback = '',
): string {
  const formattedOpen = formatBusinessTime(open, '');
  const formattedClose = formatBusinessTime(close, '');
  if (formattedOpen && formattedClose) return `${formattedOpen} – ${formattedClose}`;
  if (formattedOpen) return formattedOpen;
  if (formattedClose) return formattedClose;
  return fallback;
}
