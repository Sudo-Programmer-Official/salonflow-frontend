import { describe, expect, it } from 'vitest';
import type { QueueItem } from '../api/queue';
import { mergeQueueItemsPreservingVisitStaff } from './queueHydration';

const item = (id: string, visitStaff?: QueueItem['visitStaff']): QueueItem => ({
  id,
  customerName: id,
  customerPhone: '',
  serviceName: 'Service',
  staffName: 'Legacy service staff',
  createdAt: '2026-08-30T12:00:00.000Z',
  status: 'IN_SERVICE',
  ...(visitStaff === undefined ? {} : { visitStaff }),
});

describe('Queue visit-staff hydration', () => {
  it('keeps each check-in paired with its own visit staff across refreshes', () => {
    const existing = [
      item('checkin-a', [{ staffId: 'staff-a', staffName: 'Caden', position: 0 }]),
      item('checkin-b', [{ staffId: 'staff-b', staffName: 'Diana', position: 0 }]),
      item('checkin-c', [{ staffId: 'staff-c', staffName: 'Mary', position: 0 }]),
    ];

    const refreshed = mergeQueueItemsPreservingVisitStaff(existing, [
      item('checkin-c', undefined),
      item('checkin-a', undefined),
      item('checkin-b', undefined),
    ]);

    expect(refreshed.map((row) => [row.id, row.visitStaff?.[0]?.staffId])).toEqual([
      ['checkin-c', 'staff-c'],
      ['checkin-a', 'staff-a'],
      ['checkin-b', 'staff-b'],
    ]);
  });

  it('does not preserve stale staff over an explicit server response', () => {
    const existing = [item('checkin-a', [{ staffId: 'staff-a', position: 0 }])];
    const refreshed = mergeQueueItemsPreservingVisitStaff(existing, [item('checkin-a', [])]);

    expect(refreshed[0]?.visitStaff).toEqual([]);
  });
});
