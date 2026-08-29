import { describe, expect, test } from 'vitest';
import { deriveStaffWorkload } from './staffAvailability';
import type { QueueItem } from '../api/queue';

const item = (overrides: Partial<QueueItem>): QueueItem => ({
  id: 'checkin-1',
  customerName: 'Abhi',
  customerPhone: '',
  serviceName: 'Acrylic Removal',
  staffName: null,
  createdAt: '2026-08-26T12:00:00.000Z',
  status: 'IN_SERVICE',
  ...overrides,
});

describe('deriveStaffWorkload', () => {
  test('counts each active service line independently', () => {
    const workload = deriveStaffWorkload([
      item({
        services: [
          { id: 'line-1', serviceName: 'Pedicure', staffId: 'mary' },
          { id: 'line-2', serviceName: 'Manicure', staffId: 'jenny' },
          { id: 'line-3', serviceName: 'Gel Removal', staffId: 'mary' },
        ],
      }),
    ]);

    expect(workload.get('mary')).toEqual({
      count: 2,
      assignments: [
        { customerName: 'Abhi', serviceName: 'Pedicure' },
        { customerName: 'Abhi', serviceName: 'Gel Removal' },
      ],
    });
    expect(workload.get('jenny')).toEqual({
      count: 1,
      assignments: [{ customerName: 'Abhi', serviceName: 'Manicure' }],
    });
  });

  test('uses the legacy ticket assignment only when service rows are absent', () => {
    const workload = deriveStaffWorkload([
      item({ preferredStaffId: 'legacy-staff', services: [] }),
      item({
        id: 'checkin-2',
        preferredStaffId: 'ignored-ticket-staff',
        services: [{ id: 'line-4', serviceName: 'Basic Pedicure', staffId: 'line-staff' }],
      }),
    ]);

    expect(workload.get('legacy-staff')?.count).toBe(1);
    expect(workload.get('line-staff')?.count).toBe(1);
    expect(workload.has('ignored-ticket-staff')).toBe(false);
  });

  test('does not count visit-level staff as service workload when service lines are unassigned', () => {
    const workload = deriveStaffWorkload([
      item({
        preferredStaffId: 'visit-staff',
        services: [{ id: 'line-1', serviceName: 'Pedicure', staffId: null }],
      }),
    ]);

    expect(workload.has('visit-staff')).toBe(false);
  });
});
