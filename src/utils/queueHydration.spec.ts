import { describe, expect, it } from 'vitest';
import type { QueueItem } from '../api/queue';
import { mergeQueueItemsPreservingVisitStaff } from './queueHydration';
import {
  hasQueueServiceContext,
  queueAdditionalServiceCount,
  queueDisplayServiceNames,
  queuePrimaryServiceName,
  shouldRenderVisitStaffSummary,
} from './queuePresentation';

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

  it('renders only visit staff for a no-service walk-in with zero requested and sold services', () => {
    const noServiceWalkIn: QueueItem = {
      ...item('checkin-no-service', [{ staffId: 'staff-calvin', staffName: 'Calvin', position: 0 }]),
      serviceName: null,
      services: [],
      requestedServices: [],
      status: 'IN_SERVICE',
    };

    expect(queueDisplayServiceNames(noServiceWalkIn)).toEqual([]);
    expect(hasQueueServiceContext(noServiceWalkIn)).toBe(false);
    expect(shouldRenderVisitStaffSummary(noServiceWalkIn, true)).toBe(true);
  });

  it('renders neither context row when no service or visit staff exists', () => {
    const noContext: QueueItem = {
      ...item('checkin-no-context'),
      serviceName: null,
      services: [],
      requestedServices: [],
      visitStaff: [],
    };

    expect(hasQueueServiceContext(noContext)).toBe(false);
    expect(shouldRenderVisitStaffSummary(noContext, true)).toBe(false);
  });

  it('keeps the compact service summary without a Walk-in fallback', () => {
    const serviceVisit: QueueItem = {
      ...item('checkin-service'),
      serviceName: null,
      services: [
        { id: 'service-1', serviceName: 'Acrylic Remove Only' },
        { id: 'service-2', serviceName: 'Gel Polish' },
      ],
      requestedServices: [],
      visitStaff: [],
    };

    expect(queueDisplayServiceNames(serviceVisit)).toEqual([
      'Acrylic Remove Only',
      'Gel Polish',
    ]);
    expect(queuePrimaryServiceName(serviceVisit)).toBe('Acrylic Remove Only');
    expect(queueAdditionalServiceCount(serviceVisit)).toBe(1);
  });

  it('uses requested service context when no sold service line exists', () => {
    const requestedServiceVisit: QueueItem = {
      ...item('checkin-requested-service'),
      serviceName: null,
      services: [],
      requestedServices: [
        {
          id: 'request-1',
          serviceName: 'Acrylic Remove Only',
          status: 'REQUESTED',
        },
      ],
      visitStaff: [],
    };

    expect(queueDisplayServiceNames(requestedServiceVisit)).toEqual(['Acrylic Remove Only']);
    expect(hasQueueServiceContext(requestedServiceVisit)).toBe(true);
  });
});
