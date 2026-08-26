import { describe, expect, test } from 'vitest';
import { hasValidStaffAssignment, unassignedServiceLineCount } from './staffAssignment';
import type { QueueItem } from '../api/queue';

const item = (overrides: Partial<QueueItem>): QueueItem => ({
  id: 'checkin-1',
  customerName: 'Abhi',
  customerPhone: '',
  serviceName: 'Acrylic Removal',
  staffName: null,
  createdAt: '2026-08-26T12:00:00.000Z',
  status: 'WAITING',
  ...overrides,
});

describe('staff assignment Serve gate', () => {
  test('skips picker only when every service line has an active technician', () => {
    const activeStaffIds = new Set(['mary', 'jenny']);
    const assigned = item({
      services: [
        { id: 'line-1', serviceName: 'Pedicure', staffId: 'mary' },
        { id: 'line-2', serviceName: 'Manicure', staffId: 'jenny' },
      ],
    });
    const partial = item({
      services: [
        { id: 'line-1', serviceName: 'Pedicure', staffId: 'mary' },
        { id: 'line-2', serviceName: 'Manicure', staffId: null },
      ],
    });
    const inactive = item({
      services: [{ id: 'line-1', serviceName: 'Pedicure', staffId: 'off-staff' }],
    });

    expect(hasValidStaffAssignment(assigned, activeStaffIds)).toBe(true);
    expect(hasValidStaffAssignment(partial, activeStaffIds)).toBe(false);
    expect(hasValidStaffAssignment(inactive, activeStaffIds)).toBe(false);
    expect(unassignedServiceLineCount(partial, activeStaffIds)).toBe(1);
  });

  test('uses a legacy preferred assignment only when no service rows exist', () => {
    const activeStaffIds = new Set(['mary']);
    expect(
      hasValidStaffAssignment(item({ preferredStaffId: 'mary', services: [] }), activeStaffIds),
    ).toBe(true);
    expect(
      hasValidStaffAssignment(item({ preferredStaffId: 'mary', services: [{ serviceName: 'Pedicure', staffId: null }] }), activeStaffIds),
    ).toBe(false);
  });
});
