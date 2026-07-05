import { dayjs } from './dates';
import type { SchedulerAppointment, SchedulerDay, SchedulerSlot } from '@/api/scheduling';

export const DEFAULT_SCHEDULER_SLOT_MINUTES = 15;

export type SchedulerGridPoint = {
  label: string;
  startAt: string;
  endAt: string;
};

export const buildSchedulerGrid = (day: SchedulerDay): SchedulerGridPoint[] =>
  day.slots.map((slot: SchedulerSlot) => ({
    label: slot.label,
    startAt: slot.startAt,
    endAt: slot.endAt,
  }));

export const groupSchedulerAppointmentsByStaff = (
  appointments: SchedulerAppointment[],
) => {
  const map = new Map<string, SchedulerAppointment[]>();
  for (const appointment of appointments) {
    const key = appointment.staffId || 'unassigned';
    const bucket = map.get(key) ?? [];
    bucket.push(appointment);
    map.set(key, bucket);
  }
  return map;
};

export const mapAppointmentToTimelineBlock = (
  appointment: SchedulerAppointment,
  timezone: string,
) => {
  const start = dayjs(appointment.scheduledAt).tz(timezone);
  const end = dayjs(appointment.endAt).tz(timezone);

  return {
    id: appointment.id,
    title: appointment.customerName,
    subtitle: appointment.serviceName,
    startLabel: start.isValid() ? start.format('h:mm A') : '—',
    endLabel: end.isValid() ? end.format('h:mm A') : '—',
    dayKey: appointment.dayKey,
    durationMinutes: appointment.serviceDurationMinutes,
    status: appointment.status,
    staffId: appointment.staffId,
    staffName: appointment.staffName,
  };
};
