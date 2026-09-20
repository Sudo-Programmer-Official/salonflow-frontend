const DAY_LABELS: Record<string, string> = {
  sun: 'Sun',
  sunday: 'Sun',
  mon: 'Mon',
  monday: 'Mon',
  tue: 'Tue',
  tues: 'Tue',
  tuesday: 'Tue',
  wed: 'Wed',
  wednesday: 'Wed',
  thu: 'Thu',
  thurs: 'Thu',
  thursday: 'Thu',
  fri: 'Fri',
  friday: 'Fri',
  sat: 'Sat',
  saturday: 'Sat',
};

const asText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text && text !== '[object Object]' ? text : '';
};

const dayLabel = (value: unknown, fallback: string) => {
  const raw = asText(value) || fallback;
  return DAY_LABELS[raw.toLowerCase()] || raw;
};

const formatRange = (label: string, value: unknown): string => {
  const text = asText(value);
  if (text) return `${label}: ${text}`;
  if (!value || typeof value !== 'object') return '';

  const range = value as Record<string, unknown>;
  if (range.closed === true || range.isClosed === true || range.isOpen === false) {
    return `${label}: Closed`;
  }

  const open = asText(range.open ?? range.opens ?? range.openTime ?? range.start);
  const close = asText(range.close ?? range.closes ?? range.closeTime ?? range.end);
  if (open || close) return `${label}: ${open || '—'} - ${close || '—'}`;

  return asText(range.label ?? range.value ?? range.hours)
    ? `${label}: ${asText(range.label ?? range.value ?? range.hours)}`
    : '';
};

/** Convert all supported website/kiosk hour shapes into safe display lines. */
export const formatWebsiteHours = (value: unknown): string[] => {
  if (!value) return [];

  const text = asText(value);
  if (text) return text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => {
      const entryText = asText(entry);
      if (entryText) return [entryText];
      if (!entry || typeof entry !== 'object') return [];

      const row = entry as Record<string, unknown>;
      const label = dayLabel(row.day ?? row.name ?? row.label, `Day ${index + 1}`);
      const nested = row.hours ?? row.schedule;
      const line = formatRange(label, nested ?? row);
      return line ? [line] : [];
    });
  }

  if (typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;

  // Footer/kiosk settings commonly wrap the actual rows in `manual`.
  if (record.manual !== undefined) return formatWebsiteHours(record.manual);
  if (record.businessHours !== undefined) return formatWebsiteHours(record.businessHours);
  if (record.hours !== undefined) return formatWebsiteHours(record.hours);

  return Object.entries(record)
    .filter(([key]) => !['source', 'mode', 'timezone'].includes(key.toLowerCase()))
    .map(([day, hours]) => formatRange(dayLabel(day, day), hours))
    .filter(Boolean);
};
