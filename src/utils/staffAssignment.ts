import type { QueueItem } from '../api/queue';

export function hasValidStaffAssignment(
  item: QueueItem,
  activeStaffIds: ReadonlySet<string>,
): boolean {
  const lines = item.services ?? [];
  if (lines.length) {
    return lines.every((service) => Boolean(service.staffId && activeStaffIds.has(service.staffId)));
  }
  return Boolean(item.preferredStaffId && activeStaffIds.has(item.preferredStaffId));
}

export function unassignedServiceLineCount(
  item: QueueItem,
  activeStaffIds: ReadonlySet<string>,
): number {
  const lines = item.services ?? [];
  if (!lines.length) return hasValidStaffAssignment(item, activeStaffIds) ? 0 : 1;
  return lines.filter((service) => !service.staffId || !activeStaffIds.has(service.staffId)).length;
}
