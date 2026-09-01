import type { QueueItem } from '../api/queue';

const ACTIVE_QUEUE_STATUSES: ReadonlySet<QueueItem['status']> = new Set([
  'WAITING',
  'CALLED',
  'IN_SERVICE',
]);

/**
 * Visit staff belongs to the check-in, so its queue summary must remain
 * available even when the visit has no requested or sold service lines.
 */
export function shouldRenderVisitStaffSummary(
  item: Pick<QueueItem, 'status'>,
  staffTrackingEnabled: boolean,
): boolean {
  return staffTrackingEnabled && ACTIVE_QUEUE_STATUSES.has(item.status);
}
