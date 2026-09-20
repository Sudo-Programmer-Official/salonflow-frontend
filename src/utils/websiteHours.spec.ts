import { describe, expect, it } from 'vitest';
import { formatWebsiteHours } from './websiteHours';

describe('formatWebsiteHours', () => {
  it('formats a manual wrapper and day ranges', () => {
    expect(
      formatWebsiteHours({
        source: 'manual',
        manual: [{ day: 'monday', open: '09:00 AM', close: '07:00 PM' }],
      }),
    ).toEqual(['Mon: 09:00 AM - 07:00 PM']);
  });

  it('formats business-hours objects and closed days', () => {
    expect(
      formatWebsiteHours({
        mon: { open: '09:00 AM', close: '07:00 PM' },
        sun: { closed: true },
      }),
    ).toEqual(['Mon: 09:00 AM - 07:00 PM', 'Sun: Closed']);
  });

  it('never renders object coercion text', () => {
    expect(formatWebsiteHours('[object Object]')).toEqual([]);
    expect(formatWebsiteHours({ source: 'kiosk', manual: [] })).toEqual([]);
  });
});
