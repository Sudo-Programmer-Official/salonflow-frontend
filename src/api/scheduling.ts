import { apiUrl, buildHeaders, readJsonResponse } from '@/api/client';

export type SchedulerSlot = {
  startAt: string;
  endAt: string;
  label: string;
};

export type SchedulerDay = {
  date: string;
  label: string;
  slots: SchedulerSlot[];
};

export type SchedulerAppointment = {
  id: string;
  customerName: string;
  phoneE164: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  staffId: string | null;
  staffName: string | null;
  scheduledAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'BOOKED' | 'CHECKED_IN' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW';
  notes: string | null;
  preferredTech: string | null;
  dayKey: string;
  warningReasons: string[];
};

export type SchedulerStaffLane = {
  id: string;
  name: string;
  active: boolean;
  appointments: SchedulerAppointment[];
  weeklyAvailability: Array<{
    id: string;
    dayOfWeek: number;
    startLocalTime: string;
    endLocalTime: string;
    active: boolean;
    sortOrder: number;
  }>;
  overrides: Array<{
    id: string;
    date: string;
    isClosed: boolean;
    startLocalTime: string | null;
    endLocalTime: string | null;
    active: boolean;
  }>;
};

export type SchedulerWorkspace = {
  businessId: string;
  timezone: string;
  range: {
    from: string;
    to: string;
  };
  slotMinutes: number;
  businessHours: Record<string, { open: string; close: string } | null> | null;
  days: SchedulerDay[];
  staff: SchedulerStaffLane[];
  appointments: SchedulerAppointment[];
};

const apiBase = apiUrl('/appointments');

export async function fetchSchedulerWorkspace(params: {
  from: string;
  to: string;
  mine?: boolean;
}): Promise<SchedulerWorkspace> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  if (params.mine) search.set('mine', 'true');

  const res = await fetch(`${apiBase}/schedule?${search.toString()}`, {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  const body = await readJsonResponse(res, {} as Partial<SchedulerWorkspace> & { error?: string });
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load scheduling workspace');
  }
  return body as SchedulerWorkspace;
}
