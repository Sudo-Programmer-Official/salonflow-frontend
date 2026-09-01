import type { QueueItem } from '../api/queue';

const ACTIVE_QUEUE_STATUSES: ReadonlySet<QueueItem['status']> = new Set([
  'WAITING',
  'CALLED',
  'IN_SERVICE',
]);

type QueueServiceContextItem = Pick<
  QueueItem,
  'services' | 'requestedServices' | 'serviceName'
>;

export function queueDisplayServiceNames(item: QueueServiceContextItem): string[] {
  const soldNames =
    item.services
      ?.map((service) => service.serviceName?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];
  if (soldNames.length) return soldNames;

  const requestedNames =
    item.requestedServices
      ?.filter((service) => service.status === 'REQUESTED')
      .map((service) => service.serviceName?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];
  if (requestedNames.length) return requestedNames;

  const legacyName = item.serviceName?.trim();
  return legacyName ? [legacyName] : [];
}

export function hasQueueServiceContext(item: QueueServiceContextItem): boolean {
  return queueDisplayServiceNames(item).length > 0;
}

export function queuePrimaryServiceName(item: QueueServiceContextItem): string | null {
  return queueDisplayServiceNames(item)[0] ?? null;
}

export function queueAdditionalServiceCount(item: QueueServiceContextItem): number {
  return Math.max(queueDisplayServiceNames(item).length - 1, 0);
}

export function queueServicesTitle(item: QueueServiceContextItem): string {
  return queueDisplayServiceNames(item).join(', ');
}

/**
 * Visit staff belongs to the check-in. Render its summary when either the
 * service context or an explicit visit-staff assignment gives the card a
 * meaningful context row.
 */
export function shouldRenderVisitStaffSummary(
  item: Pick<QueueItem, 'status' | 'visitStaff'> & QueueServiceContextItem,
  staffTrackingEnabled: boolean,
): boolean {
  return (
    staffTrackingEnabled &&
    ACTIVE_QUEUE_STATUSES.has(item.status) &&
    (hasQueueServiceContext(item) || Boolean(item.visitStaff?.length))
  );
}
