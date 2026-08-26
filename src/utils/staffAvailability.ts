import type { QueueItem } from '../api/queue';

export type StaffWorkloadAssignment = {
  customerName: string;
  serviceName: string;
};

export type StaffWorkload = {
  count: number;
  assignments: StaffWorkloadAssignment[];
};

/**
 * Derive live technician workload from active service-line assignments.
 * The ticket-level preferred staff is only used for legacy check-ins that
 * have not got service rows yet.
 */
export function deriveStaffWorkload(items: QueueItem[]): Map<string, StaffWorkload> {
  const workloads = new Map<string, StaffWorkload>();
  const addAssignment = (staffId: string, assignment: StaffWorkloadAssignment) => {
    const current = workloads.get(staffId) ?? { count: 0, assignments: [] };
    current.count += 1;
    current.assignments.push(assignment);
    workloads.set(staffId, current);
  };

  items.forEach((item) => {
    const assignedLines = (item.services ?? []).filter(
      (service): service is typeof service & { staffId: string } => Boolean(service.staffId),
    );
    if (assignedLines.length) {
      assignedLines.forEach((service) => {
        addAssignment(service.staffId, {
          customerName: item.customerName || 'Customer',
          serviceName: service.serviceName,
        });
      });
      return;
    }

    if (item.preferredStaffId) {
      addAssignment(item.preferredStaffId, {
        customerName: item.customerName || 'Customer',
        serviceName: item.serviceName || item.services?.[0]?.serviceName || 'Service',
      });
    }
  });

  return workloads;
}
