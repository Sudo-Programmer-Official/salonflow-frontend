import type { QueueItem } from '../api/queue';

/**
 * Preserve an already hydrated visit-staff relationship when an older or
 * partial Queue response omits the field. An explicit empty array from the
 * server remains authoritative and clears the displayed assignment.
 */
export function mergeQueueItemsPreservingVisitStaff(
  existing: QueueItem[],
  incoming: QueueItem[],
): QueueItem[] {
  const existingById = new Map(existing.map((item) => [item.id, item]));

  return incoming.map((item) => {
    if (Object.prototype.hasOwnProperty.call(item, 'visitStaff')) {
      return item;
    }

    const previous = existingById.get(item.id);
    if (!previous || !Object.prototype.hasOwnProperty.call(previous, 'visitStaff')) {
      return item;
    }

    return { ...item, visitStaff: previous.visitStaff };
  });
}
