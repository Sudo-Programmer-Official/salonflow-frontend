<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ElButton,
  ElAlert,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElOption,
  ElPopover,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

import AppointmentActionsMenu from '../../components/admin/AppointmentActionsMenu.vue';
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  fetchAppointments,
  type Appointment,
  type AppointmentStatus,
  updateAppointment,
} from '../../api/appointments';
import { fetchPublicSettings } from '../../api/settings';
import { fetchServices, type ServiceItem } from '../../api/services';
import { fetchStaff, type StaffMember } from '../../api/staff';
import { useAppointmentAlerts } from '../../composables/useAppointmentAlerts';
import { refreshBusinessDayClock } from '../../composables/useBusinessDayClock';
import {
  DEFAULT_TIMEZONE,
  dayjs,
  formatInBusinessTz,
  getBusinessTimezone,
  nowInBusinessTz,
  setBusinessTimezone,
} from '../../utils/dates';
import { formatPhone } from '../../utils/format';
import AppointmentDayTimeline from '../../components/admin/AppointmentDayTimeline.vue';
import { useScheduler } from '../../composables/useScheduler';

type AppointmentDialogMode = 'create' | 'edit';

type AppointmentGroup = {
  key: 'upcoming' | 'in_progress' | 'completed_past';
  title: string;
  description: string;
  emptyMessage: string;
  items: Appointment[];
};

type DisplayAppointmentGroup = AppointmentGroup & {
  visibleItems: Appointment[];
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  remainingCount: number;
};

const route = useRoute();
const router = useRouter();

const role = computed(() => localStorage.getItem('role') || '');
const isStaff = computed(() => role.value === 'STAFF');
const canManageAppointments = computed(() => role.value === 'OWNER');
const COMPLETED_PAST_INCREMENT = 10;
const statusFilterOptions: Array<{ label: string; value: AppointmentStatus }> = [
  { label: 'Awaiting', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Checked In', value: 'CHECKED_IN' },
  { label: 'In Progress', value: 'BOOKED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELED' },
  { label: 'No Show', value: 'NO_SHOW' },
];

const terminalStatuses = new Set(['COMPLETED', 'NO_SHOW', 'CANCELED']);
const readRouteAppointmentDate = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

const readRouteAppointmentAt = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : null;

const resolveRouteTargetDate = (
  appointmentDate: unknown,
  appointmentAt: unknown,
  timezone: string,
) => {
  const targetAt = readRouteAppointmentAt(appointmentAt);
  if (targetAt) {
    const parsed = dayjs(targetAt).tz(timezone);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
  }

  return readRouteAppointmentDate(appointmentDate);
};

const appointments = ref<Appointment[]>([]);
const services = ref<ServiceItem[]>([]);
const staff = ref<StaffMember[]>([]);
const loading = ref(false);
const loadingServices = ref(false);
const loadingStaff = ref(false);
const actionLoading = ref<Record<string, boolean>>({});
const highlightedAppointmentId = ref<string | null>(null);
const nowTick = ref(Date.now());
const businessTimezone = ref(getBusinessTimezone() || DEFAULT_TIMEZONE);
const appointmentSearch = ref('');
const selectedStaffId = ref('');
const showSecondaryFilters = ref(false);
const statusFilters = reactive<Record<AppointmentStatus, boolean>>({
  PENDING: true,
  CONFIRMED: true,
  BOOKED: true,
  CHECKED_IN: true,
  COMPLETED: true,
  CANCELED: true,
  NO_SHOW: true,
});
const initialTargetDate = resolveRouteTargetDate(
  route.query.appointmentDate,
  route.query.appointmentAt,
  businessTimezone.value,
);

const selectedDate = ref(initialTargetDate || '');

const dialogVisible = ref(false);
const dialogMode = ref<AppointmentDialogMode>('create');
const dialogTitle = computed(() => {
  if (dialogMode.value === 'create') return 'New Appointment';
  return 'Edit Appointment';
});
const saving = ref(false);
const editingId = ref<string | null>(null);
const dialogAppointment = ref<Appointment | null>(null);
const detailVisible = ref(false);
const detailAppointment = ref<Appointment | null>(null);
const completedPastVisibleCount = ref(COMPLETED_PAST_INCREMENT);
const scheduler = useScheduler();
const schedulerWorkspace = computed(() => scheduler.workspace.value);
const schedulerLoading = computed(() => scheduler.loading.value);
const schedulerError = computed(() => scheduler.error.value);
const schedulerViewMode = ref<'day' | 'week'>('day');

const { resolveAlertByAppointmentId } = useAppointmentAlerts();

const form = reactive({
  customerName: '',
  phoneE164: '',
  serviceId: '',
  staffId: '',
  preferredTech: '',
  date: '',
  time: '',
  notes: '',
});

let consumingRouteTarget = false;
let clockId: number | null = null;

const defaultFormDate = computed(() => dayjs().tz(businessTimezone.value).format('YYYY-MM-DD'));
const selectedTimelineDate = computed(() => selectedDate.value || defaultFormDate.value);
const dialogNeedsConfirmation = computed(
  () => dialogAppointment.value && ['PENDING', 'BOOKED'].includes(dialogAppointment.value.status),
);
const schedulerRange = computed(() => {
  const base = dayjs.tz(selectedTimelineDate.value, businessTimezone.value).startOf('day');
  if (schedulerViewMode.value === 'week') {
    const start = base.subtract(base.day(), 'day');
    return {
      from: start.format('YYYY-MM-DD'),
      to: start.add(6, 'day').format('YYYY-MM-DD'),
    };
  }

  return {
    from: base.format('YYYY-MM-DD'),
    to: base.format('YYYY-MM-DD'),
  };
});
const currentTime = computed(() => {
  nowTick.value;
  return nowInBusinessTz(businessTimezone.value);
});
const currentBusinessDayStart = computed(() => currentTime.value.startOf('day'));

const timeSlots = computed(() => {
  const slots: { label: string; value: string }[] = [];
  const startHour = 8;
  const endHour = 20;

  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === endHour && minute > 0) break;

      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = dayjs(`2000-01-01T${value}`).format('h:mm A');
      slots.push({ label, value });
    }
  }

  return slots;
});

const formatDate = (value: Date | string) => {
  const zone = businessTimezone.value;

  if (value instanceof Date) {
    return dayjs(value).tz(zone).format('YYYY-MM-DD');
  }

  if (typeof value === 'string' && value.length >= 10) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? dayjs.tz(value, zone)
      : dayjs(value).tz(zone);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
  }

  return '';
};

const toDate = (iso: string) => {
  const zone = businessTimezone.value;
  const parsed = dayjs(iso).tz(zone);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

const toTime = (iso: string) => {
  const zone = businessTimezone.value;
  const parsed = dayjs(iso).tz(zone);
  return parsed.isValid() ? parsed.format('HH:mm') : '';
};

const appointmentAtBusinessTime = (appointment: Appointment) =>
  dayjs(appointment.scheduledAt).tz(businessTimezone.value);

const isPastResolvedAppointment = (appointment: Appointment) =>
  terminalStatuses.has(appointment.status);

const isConfirmationPendingAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  ['PENDING', 'BOOKED'].includes(appointment.status) &&
  appointmentAtBusinessTime(appointment).valueOf() >= currentBusinessDayStart.value.valueOf();

const isExpiredConfirmationAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  ['PENDING', 'BOOKED'].includes(appointment.status) &&
  appointmentAtBusinessTime(appointment).valueOf() < currentBusinessDayStart.value.valueOf();

const isUpcomingAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  appointmentAtBusinessTime(appointment).isAfter(currentTime.value);

const isPastBusinessDayUnresolvedAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  appointmentAtBusinessTime(appointment).isBefore(currentTime.value.startOf('day'));

const isDerivedInProgressAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  appointmentAtBusinessTime(appointment).isSame(currentTime.value, 'day') &&
  !appointmentAtBusinessTime(appointment).isAfter(currentTime.value);

type AppointmentBadge = {
  label: string;
  cls: string;
  helperLabel: string | null;
  helperCls: string | null;
};

const statusBadge = (status: string): AppointmentBadge => {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';

  switch (status) {
    case 'PENDING':
    case 'BOOKED':
      return {
        label: 'Pending',
        cls: `${base} bg-orange-100 text-orange-800`,
        helperLabel: null,
        helperCls: null,
      };
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        cls: `${base} bg-blue-100 text-blue-800`,
        helperLabel: null,
        helperCls: null,
      };
    case 'CHECKED_IN':
      return {
        label: 'Checked In',
        cls: `${base} bg-purple-100 text-purple-800`,
        helperLabel: null,
        helperCls: null,
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        cls: `${base} bg-emerald-100 text-emerald-800`,
        helperLabel: null,
        helperCls: null,
      };
    case 'CANCELED':
      return {
        label: 'Cancelled',
        cls: `${base} bg-rose-100 text-rose-800`,
        helperLabel: null,
        helperCls: null,
      };
    case 'NO_SHOW':
      return {
        label: 'No show',
        cls: `${base} bg-gray-200 text-gray-700`,
        helperLabel: null,
        helperCls: null,
      };
    default:
      return {
        label: status,
        cls: `${base} bg-slate-100 text-slate-700`,
        helperLabel: null,
        helperCls: null,
      };
  }
};

const statusBadgeForAppointment = (appointment: Appointment) => {
  if (isExpiredConfirmationAppointment(appointment)) {
    const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';
    return {
      label: 'Expired',
      helperLabel: 'Confirmation missed',
      cls: `${base} bg-amber-100 text-amber-800`,
      helperCls:
        'rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700',
    };
  }

  if (isDerivedInProgressAppointment(appointment)) {
    const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';
    return {
      label: 'In progress',
      cls: `${base} bg-orange-100 text-orange-800`,
      helperLabel: null,
      helperCls: null,
    };
  }

  return statusBadge(appointment.status);
};

const appointmentGroups = computed<AppointmentGroup[]>(() => {
  const upcoming: Appointment[] = [];
  const inProgress: Appointment[] = [];
  const completedPast: Appointment[] = [];

  for (const appointment of filteredAppointments.value) {
    if (isPastResolvedAppointment(appointment)) {
      completedPast.push(appointment);
      continue;
    }

    if (isUpcomingAppointment(appointment)) {
      upcoming.push(appointment);
      continue;
    }

    if (isPastBusinessDayUnresolvedAppointment(appointment)) {
      completedPast.push(appointment);
      continue;
    }

    inProgress.push(appointment);
  }

  completedPast.sort(
    (left, right) => dayjs(right.scheduledAt).valueOf() - dayjs(left.scheduledAt).valueOf(),
  );

  return [
    {
      key: 'upcoming',
      title: 'Upcoming',
      description: 'Appointments still ahead of the current time.',
      emptyMessage: 'No upcoming appointments found.',
      items: upcoming,
    },
    {
      key: 'in_progress',
      title: 'In Progress',
      description: 'Appointments whose scheduled time has started and still need completion.',
      emptyMessage: 'No appointments are currently in progress.',
      items: inProgress,
    },
    {
      key: 'completed_past',
      title: 'Completed / Past',
      description: 'Completed, no-show, cancelled, and stale past appointments remain visible for reference.',
      emptyMessage: 'No completed or past appointments found.',
      items: completedPast,
    },
  ];
});

const displayedAppointmentGroups = computed<DisplayAppointmentGroup[]>(() =>
  appointmentGroups.value.map((group) => {
    const visibleItems =
      group.key === 'completed_past'
        ? group.items.slice(0, completedPastVisibleCount.value)
        : group.items;

    return {
      ...group,
      visibleItems,
      visibleCount: visibleItems.length,
      totalCount: group.items.length,
      hasMore: visibleItems.length < group.items.length,
      remainingCount: Math.max(0, group.items.length - visibleItems.length),
    };
  }),
);
const activeAppointmentGroups = computed(() =>
  displayedAppointmentGroups.value.filter((group) => group.key !== 'completed_past'),
);
const completedPastAppointmentGroup = computed(
  () => displayedAppointmentGroups.value.find((group) => group.key === 'completed_past') ?? null,
);

const nextAppointment = computed(() => appointmentGroups.value[0]?.items[0] ?? null);
const appointmentsVisible = computed(() => filteredAppointments.value.length > 0);
const emptyStateMessage = computed(() => {
  if (selectedDate.value) {
    return isStaff.value ? 'No appointments assigned for this date.' : 'No appointments for this date.';
  }

  return isStaff.value ? 'No appointments assigned yet.' : 'No appointments found.';
});

const loadMoreCompletedPast = async () => {
  const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  completedPastVisibleCount.value += COMPLETED_PAST_INCREMENT;
  await nextTick();
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: currentScrollY });
  }
};

const resetForm = () => {
  form.customerName = '';
  form.phoneE164 = '';
  form.serviceId = '';
  form.staffId = '';
  form.preferredTech = '';
  form.date = formatDate(selectedDate.value) || defaultFormDate.value;
  form.time = '';
  form.notes = '';
  editingId.value = null;
};

const applyAppointmentToForm = (appointment: Appointment) => {
  editingId.value = appointment.id;
  dialogAppointment.value = appointment;
  form.customerName = appointment.customerName;
  form.phoneE164 = appointment.phoneE164;
  form.serviceId = appointment.serviceId || '';
  form.staffId = appointment.staffId || '';
  form.preferredTech = appointment.preferredTech || '';
  form.date = toDate(appointment.scheduledAt);
  form.time = toTime(appointment.scheduledAt);
  form.notes = appointment.notes || '';
};

const clearAppointmentRouteQuery = async () => {
  const nextQuery = { ...route.query };
  delete nextQuery.appointmentId;
  delete nextQuery.appointmentAt;
  delete nextQuery.appointmentDate;
  delete nextQuery.alert;
  await router.replace({ query: nextQuery });
};

const openCreate = (prefill?: { date?: string; time?: string; staffId?: string | null }) => {
  if (!canManageAppointments.value) {
    return;
  }

  dialogMode.value = 'create';
  dialogAppointment.value = null;
  detailVisible.value = false;
  resetForm();
  if (prefill?.date) {
    form.date = prefill.date;
  }
  if (prefill?.time) {
    form.time = prefill.time;
  }
  if (typeof prefill?.staffId !== 'undefined') {
    form.staffId = prefill.staffId || '';
  }
  dialogVisible.value = true;
};

const openEdit = (appointment: Appointment) => {
  if (!canManageAppointments.value) {
    return;
  }

  dialogMode.value = 'edit';
  detailVisible.value = false;
  applyAppointmentToForm(appointment);
  dialogVisible.value = true;
};

const openView = (appointment: Appointment) => {
  detailAppointment.value = appointment;
  detailVisible.value = true;
};

const consumeRouteAppointmentTarget = async (sourceAppointments = appointments.value) => {
  const appointmentId =
    typeof route.query.appointmentId === 'string' ? route.query.appointmentId : null;
  const appointmentDate = resolveRouteTargetDate(
    route.query.appointmentDate,
    route.query.appointmentAt,
    businessTimezone.value,
  );
  const shouldOpenFromAlert = route.query.alert === '1';

  if (!appointmentId || consumingRouteTarget) {
    return;
  }

  if (appointmentDate && appointmentDate !== selectedDate.value) {
    return;
  }

  const appointment = sourceAppointments.find((candidate) => candidate.id === appointmentId);

  if (!appointment) {
    return;
  }

  consumingRouteTarget = true;

  try {
    highlightedAppointmentId.value = appointmentId;

    if (shouldOpenFromAlert) {
      openView(appointment);
      resolveAlertByAppointmentId(appointmentId);
    }

    await clearAppointmentRouteQuery();
  } finally {
    consumingRouteTarget = false;
  }
};

const loadAppointments = async () => {
  loading.value = true;

  try {
    const nextAppointments = await fetchAppointments({
      date: selectedDate.value,
      ...(isStaff.value ? { mine: true } : {}),
    });

    appointments.value = nextAppointments;
    await consumeRouteAppointmentTarget(nextAppointments);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load appointments');
  } finally {
    loading.value = false;
  }
};

const syncBusinessTimezone = async () => {
  try {
    const settings = await fetchPublicSettings();
    const nextTimezone = settings.timezone?.trim() || getBusinessTimezone() || DEFAULT_TIMEZONE;
    if (!nextTimezone) return;
    businessTimezone.value = nextTimezone;
    setBusinessTimezone(nextTimezone);
    refreshBusinessDayClock();
  } catch {
    businessTimezone.value = getBusinessTimezone() || DEFAULT_TIMEZONE;
  }
};

const loadServices = async () => {
  loadingServices.value = true;

  try {
    services.value = await fetchServices();
  } catch {
    services.value = [];
  } finally {
    loadingServices.value = false;
  }
};

const loadStaff = async () => {
  loadingStaff.value = true;

  try {
    const response = await fetchStaff();
    staff.value = response.items;
  } catch {
    staff.value = [];
  } finally {
    loadingStaff.value = false;
  }
};

onMounted(async () => {
  await syncBusinessTimezone();
  const routeTargetDate = resolveRouteTargetDate(
    route.query.appointmentDate,
    route.query.appointmentAt,
    businessTimezone.value,
  );
  if (routeTargetDate) {
    selectedDate.value = routeTargetDate;
  } else {
    selectedDate.value = '';
  }
  form.date = selectedDate.value || defaultFormDate.value;
  clockId = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 60000);
  void Promise.all([loadAppointments(), loadServices(), loadStaff()]);
});

onUnmounted(() => {
  if (clockId !== null) {
    window.clearInterval(clockId);
    clockId = null;
  }
});

watch(selectedDate, () => {
  completedPastVisibleCount.value = COMPLETED_PAST_INCREMENT;
  if (!dialogVisible.value || dialogMode.value === 'create') {
    form.date = selectedDate.value || defaultFormDate.value;
  }
  highlightedAppointmentId.value = null;
  void loadAppointments();
});

watch(
  () => [route.query.appointmentId, route.query.appointmentAt, route.query.appointmentDate, route.query.alert],
  () => {
    const nextAppointmentDate = resolveRouteTargetDate(
      route.query.appointmentDate,
      route.query.appointmentAt,
      businessTimezone.value,
    );
    if (nextAppointmentDate && nextAppointmentDate !== selectedDate.value) {
      selectedDate.value = nextAppointmentDate;
      return;
    }

    void consumeRouteAppointmentTarget();
  },
);

const buildScheduledAt = () => {
  if (!form.date || !form.time) {
    return '';
  }

  const zone = businessTimezone.value;
  const composed = dayjs.tz(`${form.date}T${form.time}:00`, zone);
  return composed.isValid() ? composed.utc().toISOString() : '';
};

const setSelectedDateToToday = () => {
  selectedDate.value = dayjs().tz(businessTimezone.value).format('YYYY-MM-DD');
};

const shiftSelectedDate = (days: number) => {
  const base = selectedDate.value
    ? dayjs.tz(selectedDate.value, businessTimezone.value)
    : dayjs().tz(businessTimezone.value);
  selectedDate.value = base.add(days, 'day').format('YYYY-MM-DD');
};

const toggleStatusFilter = (status: AppointmentStatus) => {
  statusFilters[status] = !statusFilters[status];
};

const clearFilters = () => {
  appointmentSearch.value = '';
  selectedStaffId.value = '';
  Object.keys(statusFilters).forEach((key) => {
    statusFilters[key as AppointmentStatus] = true;
  });
};

const selectedStatusCount = computed(() =>
  Object.values(statusFilters).filter(Boolean).length,
);

const hasActiveFilters = computed(
  () => Boolean(selectedStaffId.value) || selectedStatusCount.value < statusFilterOptions.length,
);

const activeStatusSet = computed(
  () =>
    new Set(
      (Object.entries(statusFilters) as Array<[AppointmentStatus, boolean]>)
        .filter(([, enabled]) => enabled)
        .map(([status]) => status),
    ),
);

const normalizedSearch = computed(() => appointmentSearch.value.trim().toLowerCase());

const filteredAppointments = computed(() =>
  appointments.value.filter((appointment) => {
    if (selectedStaffId.value && appointment.staffId !== selectedStaffId.value) {
      return false;
    }

    if (!activeStatusSet.value.has(appointment.status)) {
      return false;
    }

    const query = normalizedSearch.value;
    if (query) {
      const haystack = [
        appointment.customerName,
        appointment.phoneE164,
        appointment.serviceName,
        appointment.staffName ?? '',
        appointment.preferredTech ?? '',
        appointment.status,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  }),
);

const saveAppointment = async () => {
  if (!form.customerName || !form.phoneE164 || !form.serviceId || !form.date || !form.time) {
    ElMessage.warning('Name, phone, service, date, and time are required');
    return;
  }

  const scheduledAt = buildScheduledAt();

  if (!scheduledAt) {
    ElMessage.error('Invalid date/time. Please pick a valid slot.');
    return;
  }

  saving.value = true;

  try {
    if (dialogMode.value === 'create') {
      await createAppointment({
        customerName: form.customerName.trim(),
        phoneE164: form.phoneE164.trim(),
        serviceId: form.serviceId,
        staffId: form.staffId || undefined,
        scheduledAt,
        notes: form.notes || undefined,
        preferredTech: form.preferredTech || undefined,
      });
      ElMessage.success('Appointment created');
    } else if (editingId.value) {
      await updateAppointment(editingId.value, {
        customerName: form.customerName.trim(),
        phoneE164: form.phoneE164.trim(),
        serviceId: form.serviceId,
        staffId: form.staffId || undefined,
        scheduledAt,
        notes: form.notes || undefined,
        preferredTech: form.preferredTech || undefined,
      });
      ElMessage.success('Appointment updated');
    }

    dialogVisible.value = false;
    dialogAppointment.value = null;
    detailVisible.value = false;
    await loadAppointments();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Save failed');
  } finally {
    saving.value = false;
  }
};

const handleCancel = async (id: string) => {
  actionLoading.value = { ...actionLoading.value, [id]: true };

  try {
    await cancelAppointment(id);
    await loadAppointments();
    ElMessage.success('Appointment canceled');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Cancel failed');
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false };
  }
};

const handleComplete = async (id: string) => {
  actionLoading.value = { ...actionLoading.value, [id]: true };

  try {
    await completeAppointment(id);
    await loadAppointments();
    ElMessage.success('Appointment completed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Complete failed');
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false };
  }
};

const handleConfirm = async (id: string) => {
  actionLoading.value = { ...actionLoading.value, [id]: true };

  try {
    await confirmAppointment(id);
    await loadAppointments();
    ElMessage.success('Appointment confirmed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Confirm failed');
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false };
  }
};

const handlePrimaryAction = async ({
  appointment,
  action,
}: {
  appointment: Appointment;
  action: 'confirm' | 'complete';
}) => {
  if (action === 'confirm') {
    await handleConfirm(appointment.id);
    return;
  }
  await handleComplete(appointment.id);
};

const appointmentRowClassName = ({ row }: { row: Appointment }) =>
  row.id === highlightedAppointmentId.value ? 'appointment-row--highlighted' : '';

const appointmentTotals = computed(() => {
  const total = filteredAppointments.value.length;
  const upcoming = filteredAppointments.value.filter(
    (appointment) =>
      !isPastResolvedAppointment(appointment) &&
      appointment.status === 'CONFIRMED' &&
      appointmentAtBusinessTime(appointment).valueOf() >= currentTime.value.valueOf(),
  ).length;
  const needsConfirmation = filteredAppointments.value.filter(isConfirmationPendingAppointment).length;
  const inProgress = appointmentGroups.value[1]?.items.length ?? 0;
  const completed = filteredAppointments.value.filter(
    (appointment) => appointment.status === 'COMPLETED',
  ).length;
  const checkedIn = filteredAppointments.value.filter(
    (appointment) => appointment.status === 'CHECKED_IN',
  ).length;
  const occupancy = total > 0 ? Math.round(((checkedIn + inProgress) / total) * 100) : 0;

  return {
    total,
    upcoming,
    needsConfirmation,
    inProgress,
    completed,
    checkedIn,
    occupancy,
  };
});

const appointmentCountdown = (appointment: Appointment | null) => {
  nowTick.value;
  if (!appointment) {
    return '';
  }

  const now = nowInBusinessTz(businessTimezone.value);
  const start = dayjs(appointment.scheduledAt).tz(businessTimezone.value);
  if (!start.isValid()) {
    return '';
  }

  const minutes = Math.max(0, Math.round(start.diff(now, 'minute', true)));
  if (minutes <= 0) {
    return 'Starting now';
  }
  if (minutes < 60) {
    return `Starts in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `Starts in ${hours}h ${remainder}m` : `Starts in ${hours}h`;
};

const nextAppointmentCountdown = computed(() => appointmentCountdown(nextAppointment.value));

const openNextAppointmentCheckIn = () => {
  if (!nextAppointment.value) {
    return;
  }

  router.push({
    name: 'admin-queue',
    query: {
      newCheckin: '1',
      appointmentCustomer: nextAppointment.value.customerName,
      appointmentPhone: nextAppointment.value.phoneE164 || '',
      appointmentService: nextAppointment.value.serviceName,
      appointmentStaff: nextAppointment.value.staffName || '',
    },
  });
};

const openAppointmentCheckIn = (appointment: Appointment | null) => {
  if (!appointment) {
    return;
  }

  router.push({
    name: 'admin-queue',
    query: {
      newCheckin: '1',
      appointmentCustomer: appointment.customerName,
      appointmentPhone: appointment.phoneE164 || '',
      appointmentService: appointment.serviceName,
      appointmentStaff: appointment.staffName || '',
    },
  });
};

const handleTimelineAppointmentClick = (appointmentId: string) => {
  const appointment = appointments.value.find((candidate) => candidate.id === appointmentId);
  if (!appointment) {
    return;
  }

  openView(appointment);
};

const handleTimelineSlotClick = ({
  startAt,
  staffId,
}: {
  startAt: string;
  staffId: string | null;
}) => {
  if (!canManageAppointments.value) {
    return;
  }

  const slotTime = formatInBusinessTz(startAt, 'HH:mm', businessTimezone.value);
  const slotDate = formatInBusinessTz(startAt, 'YYYY-MM-DD', businessTimezone.value);
  openCreate({
    date: slotDate,
    time: slotTime,
    staffId,
  });
};

const handleTimelineAppointmentMove = async ({
  appointmentId,
  startAt,
  staffId,
}: {
  appointmentId: string;
  startAt: string;
  staffId: string | null;
}) => {
  if (!canManageAppointments.value) {
    return;
  }

  const appointment = appointments.value.find((candidate) => candidate.id === appointmentId);
  if (!appointment) {
    return;
  }

  actionLoading.value = { ...actionLoading.value, [appointmentId]: true };

  try {
    const nextDate = dayjs(startAt).tz(businessTimezone.value).format('YYYY-MM-DD');
    const nextTime = dayjs(startAt).tz(businessTimezone.value).format('HH:mm');
    const scheduledAt = dayjs.tz(`${nextDate}T${nextTime}:00`, businessTimezone.value)
      .utc()
      .toISOString();

    await updateAppointment(appointment.id, {
      customerName: appointment.customerName,
      phoneE164: appointment.phoneE164,
      serviceId: appointment.serviceId,
      staffId: staffId || undefined,
      scheduledAt,
      notes: appointment.notes || undefined,
      preferredTech: appointment.preferredTech || undefined,
    });

    ElMessage.success('Appointment moved');
    await loadAppointments();
    await scheduler.refresh(schedulerRange.value);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Move failed');
  } finally {
    actionLoading.value = { ...actionLoading.value, [appointmentId]: false };
  }
};

watch(
  schedulerRange,
  (range) => {
    void scheduler.refresh(range);
  },
  { immediate: true },
);
</script>

<template>
  <div class="appointment-page space-y-5">
    <div class="appointment-page__header">
      <div class="appointment-page__title-group">
        <h1 class="text-2xl font-semibold text-slate-900">Appointments</h1>
      </div>

      <div class="appointment-page__header-actions">
        <div class="appointment-view-toggle" role="group" aria-label="Calendar view">
          <ElButton
            class="sf-btn appointment-toolbar__action appointment-toolbar__action--segment"
            :type="schedulerViewMode === 'day' ? 'primary' : 'default'"
            @click="schedulerViewMode = 'day'"
          >
            Day
          </ElButton>
          <ElButton
            class="sf-btn appointment-toolbar__action appointment-toolbar__action--segment"
            :type="schedulerViewMode === 'week' ? 'primary' : 'default'"
            @click="schedulerViewMode = 'week'"
          >
            Week
          </ElButton>
        </div>

        <ElButton
          v-if="canManageAppointments"
          type="primary"
          class="sf-btn appointment-page__header-action"
          @click="() => openCreate()"
        >
          <ElIcon aria-hidden="true">
            <Plus />
          </ElIcon>
          New Appointment
        </ElButton>
      </div>
    </div>

    <div class="appointment-layout">
      <div class="appointment-main">
        <ElCard class="appointment-toolbar-card">
          <div class="appointment-toolbar">
            <div class="appointment-toolbar__row appointment-toolbar__row--primary">
              <div class="appointment-day-nav">
                <ElButton class="sf-btn appointment-day-nav__button" @click="setSelectedDateToToday">
                  Today
                </ElButton>
                <ElButton class="sf-btn appointment-day-nav__button" @click="shiftSelectedDate(-1)">
                  ←
                </ElButton>
                <ElDatePicker
                  v-model="selectedDate"
                  type="date"
                  placeholder="Pick a date"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="sf-input appointment-day-nav__picker"
                />
                <ElButton class="sf-btn appointment-day-nav__button" @click="shiftSelectedDate(1)">
                  →
                </ElButton>
              </div>

              <div class="appointment-toolbar__actions">
                <ElInput
                  v-model="appointmentSearch"
                  clearable
                  placeholder="Search customers, phone, or service..."
                  class="sf-input appointment-search"
                />

                <ElPopover
                  v-model:visible="showSecondaryFilters"
                  trigger="click"
                  placement="bottom-end"
                  :width="320"
                  :teleported="true"
                  popper-class="appointment-filters-popover"
                >
                  <template #reference>
                    <ElButton
                      class="sf-btn appointment-toolbar__action appointment-toolbar__action--filters"
                      :type="hasActiveFilters ? 'primary' : 'default'"
                    >
                      Filters ▼
                    </ElButton>
                  </template>

                  <div class="appointment-filters-popover__content">
                    <div class="appointment-filters-popover__header">
                      <div>
                        <p class="appointment-filters-popover__eyebrow">Filters</p>
                        <h3 class="appointment-filters-popover__title">Staff & status</h3>
                      </div>
                      <ElButton class="sf-btn appointment-filters-popover__clear" @click="clearFilters">
                        Reset
                      </ElButton>
                    </div>

                    <div class="appointment-filters-popover__section">
                      <div class="appointment-filters-popover__label">Staff</div>
                      <ElSelect
                        v-model="selectedStaffId"
                        clearable
                        placeholder="All staff"
                        class="appointment-filters-popover__select"
                      >
                        <ElOption label="All staff" value="" />
                        <ElOption
                          v-for="member in staff"
                          :key="member.id"
                          :label="member.name"
                          :value="member.id"
                        />
                      </ElSelect>
                    </div>

                    <div class="appointment-filters-popover__section">
                      <div class="appointment-filters-popover__label">Status</div>
                      <div class="appointment-status-row">
                        <button
                          v-for="status in statusFilterOptions"
                          :key="status.value"
                          type="button"
                          class="appointment-status-chip"
                          :class="{ 'appointment-status-chip--active': statusFilters[status.value] }"
                          @click="toggleStatusFilter(status.value)"
                        >
                          {{ status.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </ElPopover>

              </div>
            </div>
          </div>
        </ElCard>

        <div class="appointment-kpi-grid">
          <ElCard class="appointment-kpi-card">
            <div class="appointment-kpi-card__label">Upcoming</div>
            <div class="appointment-kpi-card__value">{{ appointmentTotals.upcoming }}</div>
          </ElCard>
          <ElCard class="appointment-kpi-card appointment-kpi-card--accent">
            <div class="appointment-kpi-card__label">Needs Confirmation</div>
            <div class="appointment-kpi-card__value">{{ appointmentTotals.needsConfirmation }}</div>
          </ElCard>
          <ElCard class="appointment-kpi-card">
            <div class="appointment-kpi-card__label">Checked In</div>
            <div class="appointment-kpi-card__value">{{ appointmentTotals.checkedIn }}</div>
          </ElCard>
          <ElCard class="appointment-kpi-card">
            <div class="appointment-kpi-card__label">In Progress</div>
            <div class="appointment-kpi-card__value">{{ appointmentTotals.inProgress }}</div>
          </ElCard>
          <ElCard class="appointment-kpi-card">
            <div class="appointment-kpi-card__label">Completed</div>
            <div class="appointment-kpi-card__value">{{ appointmentTotals.completed }}</div>
          </ElCard>
          <ElCard class="appointment-kpi-card appointment-kpi-card--accent">
            <div class="appointment-kpi-card__label">Occupancy</div>
            <div class="appointment-kpi-card__value">{{ appointmentTotals.occupancy }}%</div>
          </ElCard>
        </div>

        <ElCard v-if="nextAppointment" class="appointment-next-strip">
          <div class="appointment-next-strip__content">
            <div class="appointment-next-strip__copy">
              <p class="appointment-next-strip__eyebrow">Next appointment</p>
              <div class="appointment-next-strip__name">{{ nextAppointment.customerName }}</div>
              <div class="appointment-next-strip__meta">
                {{ formatInBusinessTz(nextAppointment.scheduledAt, 'ddd, MMM D • h:mm A', businessTimezone) }}
                •
                {{ nextAppointment.serviceName }}
                •
                {{ nextAppointmentCountdown }}
              </div>
            </div>
            <div class="appointment-next-strip__actions">
              <span :class="statusBadgeForAppointment(nextAppointment).cls">
                {{ statusBadgeForAppointment(nextAppointment).label }}
              </span>
              <ElButton class="sf-btn appointment-next-strip__button" @click="openView(nextAppointment)">
                View
              </ElButton>
              <ElButton
                v-if="canManageAppointments"
                type="primary"
                class="sf-btn appointment-next-strip__button"
                @click="openNextAppointmentCheckIn"
              >
                Check In
              </ElButton>
            </div>
          </div>
        </ElCard>

        <div v-if="!loading && !appointmentsVisible" class="appointment-empty-state">
          <div class="appointment-empty-state__title">{{ emptyStateMessage }}</div>
          <p class="appointment-empty-state__copy">Create a new appointment or clear filters to continue.</p>
          <ElButton
            v-if="canManageAppointments"
            type="primary"
            class="sf-btn appointment-empty-state__button"
            @click="() => openCreate()"
          >
            Create Appointment
          </ElButton>
        </div>

        <div v-if="loading || appointmentsVisible" class="space-y-4">
          <div v-for="group in activeAppointmentGroups" :key="group.key" class="space-y-2">
            <ElCard class="bg-white">
              <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-lg font-semibold text-slate-900">{{ group.title }}</div>
                  <div class="text-sm text-slate-600">{{ group.description }}</div>
                </div>
                <div class="text-sm font-medium text-slate-500">
                  {{ group.totalCount }} appointment{{ group.totalCount === 1 ? '' : 's' }}
                </div>
              </div>

              <ElTable
                v-if="loading || group.visibleItems.length > 0"
                :data="group.visibleItems"
                :loading="loading"
                :row-class-name="appointmentRowClassName"
                class="appointment-table"
                stripe
              >
                <ElTableColumn label="Time" min-width="108">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-0.5">
                      <span class="font-medium text-slate-900">
                        {{ formatInBusinessTz(row.scheduledAt, 'h:mm A', businessTimezone) }}
                      </span>
                      <span class="text-xs text-slate-500">
                        {{ formatInBusinessTz(row.scheduledAt, 'MMM D', businessTimezone) }}
                      </span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="Customer" min-width="152">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-0.5">
                      <span class="font-medium text-slate-900">{{ row.customerName }}</span>
                      <span class="text-xs text-slate-500">{{ formatPhone(row.phoneE164) }}</span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="serviceName" label="Service" min-width="136" />
                <ElTableColumn label="Staff" min-width="150">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-0.5">
                      <span>{{ row.staffName || '—' }}</span>
                      <span
                        v-if="row.preferredTech && row.preferredTech !== row.staffName"
                        class="text-xs text-slate-500"
                      >
                        Prefers {{ row.preferredTech }}
                      </span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="status" label="Status" min-width="132" class-name="appointment-table__status-cell">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-1">
                      <span :class="statusBadgeForAppointment(row).cls">
                        {{ statusBadgeForAppointment(row).label }}
                      </span>
                      <span
                        v-if="statusBadgeForAppointment(row).helperLabel"
                        :class="statusBadgeForAppointment(row).helperCls"
                      >
                        {{ statusBadgeForAppointment(row).helperLabel }}
                      </span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn
                  label="Actions"
                  min-width="220"
                  align="right"
                  class-name="appointment-table__actions-cell"
                >
                  <template #default="{ row }">
                    <AppointmentActionsMenu
                      :appointment="row"
                      :disabled="Boolean(actionLoading[row.id])"
                      :loading="Boolean(actionLoading[row.id])"
                      :can-manage="canManageAppointments"
                      @view="openView"
                      @edit="openEdit"
                      @cancel="handleCancel($event.id)"
                      @primary="handlePrimaryAction"
                    />
                  </template>
                </ElTableColumn>
              </ElTable>

              <div
                v-else-if="!loading"
                class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500"
              >
                {{ group.emptyMessage }}
              </div>

            </ElCard>
          </div>

          <AppointmentDayTimeline
            :workspace="schedulerWorkspace"
            :loading="schedulerLoading"
            :error="schedulerError"
            :mode="schedulerViewMode"
            :can-manage="canManageAppointments"
            @appointment-click="handleTimelineAppointmentClick"
            @appointment-move="handleTimelineAppointmentMove"
            @slot-click="handleTimelineSlotClick"
          />

          <div v-if="completedPastAppointmentGroup" class="space-y-2">
            <ElCard class="bg-white">
              <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-lg font-semibold text-slate-900">
                    {{ completedPastAppointmentGroup.title }}
                  </div>
                  <div class="text-sm text-slate-600">
                    {{ completedPastAppointmentGroup.description }}
                  </div>
                </div>
                <div class="text-sm font-medium text-slate-500">
                  {{ completedPastAppointmentGroup.totalCount }} appointment{{
                    completedPastAppointmentGroup.totalCount === 1 ? '' : 's'
                  }}
                </div>
              </div>

              <ElTable
                v-if="loading || completedPastAppointmentGroup.visibleItems.length > 0"
                :data="completedPastAppointmentGroup.visibleItems"
                :loading="loading"
                :row-class-name="appointmentRowClassName"
                class="appointment-table appointment-table--past"
                stripe
              >
                <ElTableColumn label="Time" min-width="108">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-0.5">
                      <span class="font-medium text-slate-900">
                        {{ formatInBusinessTz(row.scheduledAt, 'h:mm A', businessTimezone) }}
                      </span>
                      <span class="text-xs text-slate-500">
                        {{ formatInBusinessTz(row.scheduledAt, 'MMM D', businessTimezone) }}
                      </span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="Customer" min-width="152">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-0.5">
                      <span class="font-medium text-slate-900">{{ row.customerName }}</span>
                      <span class="text-xs text-slate-500">{{ formatPhone(row.phoneE164) }}</span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="serviceName" label="Service" min-width="136" />
                <ElTableColumn label="Staff" min-width="150">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-0.5">
                      <span>{{ row.staffName || '—' }}</span>
                      <span
                        v-if="row.preferredTech && row.preferredTech !== row.staffName"
                        class="text-xs text-slate-500"
                      >
                        Prefers {{ row.preferredTech }}
                      </span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="status" label="Status" min-width="132" class-name="appointment-table__status-cell">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-1">
                      <span :class="statusBadgeForAppointment(row).cls">
                        {{ statusBadgeForAppointment(row).label }}
                      </span>
                      <span
                        v-if="statusBadgeForAppointment(row).helperLabel"
                        :class="statusBadgeForAppointment(row).helperCls"
                      >
                        {{ statusBadgeForAppointment(row).helperLabel }}
                      </span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn
                  label="Actions"
                  min-width="220"
                  align="right"
                  class-name="appointment-table__actions-cell"
                >
                  <template #default="{ row }">
                    <AppointmentActionsMenu
                      :appointment="row"
                      :disabled="Boolean(actionLoading[row.id])"
                      :loading="Boolean(actionLoading[row.id])"
                      :can-manage="canManageAppointments"
                      @view="openView"
                      @edit="openEdit"
                      @cancel="handleCancel($event.id)"
                      @primary="handlePrimaryAction"
                    />
                  </template>
                </ElTableColumn>
              </ElTable>

              <div
                v-else-if="!loading"
                class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500"
              >
                {{ completedPastAppointmentGroup.emptyMessage }}
              </div>

              <div
                v-if="!loading && completedPastAppointmentGroup.hasMore"
                class="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="text-sm text-slate-500">
                  Showing {{ completedPastAppointmentGroup.visibleCount }} of
                  {{ completedPastAppointmentGroup.totalCount }} appointments
                </div>
                <ElButton size="small" class="sf-btn" @click="loadMoreCompletedPast">
                  Load {{ Math.min(COMPLETED_PAST_INCREMENT, completedPastAppointmentGroup.remainingCount) }} more
                </ElButton>
              </div>
            </ElCard>
          </div>
        </div>
    </div>

    </div>

    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="760px" class="appointment-dialog">
      <div class="space-y-4">
        <ElForm label-position="top" class="appointment-dialog-form">
          <ElAlert
            v-if="dialogNeedsConfirmation"
            type="warning"
            :closable="false"
            class="appointment-dialog-alert"
          >
            <template #title>Needs confirmation</template>
            <template #default>
              This time is reserved, but the salon still needs to confirm it.
            </template>
          </ElAlert>
          <div class="appointment-dialog-grid">
          <ElFormItem label="Customer name" required>
            <ElInput v-model="form.customerName" placeholder="Customer name" />
          </ElFormItem>
          <ElFormItem label="Phone number" required>
            <ElInput v-model="form.phoneE164" placeholder="+1 555 123 4567" />
          </ElFormItem>
          <ElFormItem label="Service" required>
            <ElSelect
              v-model="form.serviceId"
              placeholder="Select service"
              filterable
              :loading="loadingServices"
            >
              <ElOption
                v-for="service in services"
                :key="service.id"
                :label="service.name"
                :value="service.id"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Staff (optional)">
            <ElSelect
              v-model="form.staffId"
              placeholder="Select staff"
              clearable
              filterable
              :loading="loadingStaff"
            >
              <ElOption
                v-for="member in staff"
                :key="member.id"
                :label="member.name"
                :value="member.id"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Preferred tech (optional)">
            <ElInput v-model="form.preferredTech" placeholder="e.g. Alex (nails)" />
          </ElFormItem>
          <ElFormItem label="Date" required>
            <ElDatePicker
              v-model="form.date"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="YYYY-MM-DD"
            />
          </ElFormItem>
          <ElFormItem label="Time" required>
            <ElSelect v-model="form.time" placeholder="Select time" filterable>
              <ElOption
                v-for="slot in timeSlots"
                :key="slot.value"
                :label="slot.label"
                :value="slot.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Notes" class="appointment-dialog-grid__notes">
            <ElInput v-model="form.notes" type="textarea" :rows="3" placeholder="Notes (optional)" />
          </ElFormItem>
          </div>
        </ElForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton class="sf-btn" @click="dialogVisible = false">
            Cancel
          </ElButton>
          <ElButton type="primary" class="sf-btn" :loading="saving" @click="saveAppointment">
            Save
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <ElDrawer
      v-model="detailVisible"
      size="420px"
      direction="rtl"
      class="appointment-detail-drawer"
      :with-header="false"
    >
      <div v-if="detailAppointment" class="appointment-detail-drawer__content">
        <div class="appointment-detail-drawer__header">
          <div>
            <p class="appointment-detail-drawer__eyebrow">Appointment details</p>
            <h3 class="appointment-detail-drawer__title">{{ detailAppointment.customerName }}</h3>
            <p class="appointment-detail-drawer__copy">
              {{ formatInBusinessTz(detailAppointment.scheduledAt, 'ddd, MMM D • h:mm A', businessTimezone) }}
            </p>
          </div>
          <ElButton text class="appointment-detail-drawer__close" @click="detailVisible = false">
            ✕
          </ElButton>
        </div>

        <div class="appointment-detail-drawer__status">
          <span :class="statusBadgeForAppointment(detailAppointment).cls">
            {{ statusBadgeForAppointment(detailAppointment).label }}
          </span>
          <span
            v-if="statusBadgeForAppointment(detailAppointment).helperLabel"
            :class="statusBadgeForAppointment(detailAppointment).helperCls"
          >
            {{ statusBadgeForAppointment(detailAppointment).helperLabel }}
          </span>
        </div>

        <dl class="appointment-detail-drawer__details">
          <div>
            <dt>Service</dt>
            <dd>{{ detailAppointment.serviceName }}</dd>
          </div>
          <div>
            <dt>Staff</dt>
            <dd>{{ detailAppointment.staffName || 'Unassigned' }}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{{ formatPhone(detailAppointment.phoneE164) }}</dd>
          </div>
          <div>
            <dt>Countdown</dt>
            <dd>{{ appointmentCountdown(detailAppointment) }}</dd>
          </div>
        </dl>

          <div class="appointment-detail-drawer__notes">
            <div class="appointment-detail-drawer__notes-label">Notes</div>
            <p>{{ detailAppointment.notes || 'No notes added.' }}</p>
          </div>

          <div class="appointment-detail-drawer__actions">
            <ElButton class="sf-btn appointment-detail-drawer__button" @click="openEdit(detailAppointment)">
              Edit
            </ElButton>
            <ElButton
              v-if="canManageAppointments"
              class="sf-btn appointment-detail-drawer__button"
              @click="openAppointmentCheckIn(detailAppointment)"
            >
              Check In
            </ElButton>
            <ElButton
              type="primary"
              class="sf-btn appointment-detail-drawer__button"
              @click="detailVisible = false"
            >
              Close
            </ElButton>
          </div>
        </div>
      </ElDrawer>
  </div>
</template>

<style scoped>
.appointment-layout {
  display: grid;
  gap: 1rem;
}

.appointment-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.appointment-page__title-group {
  min-width: 0;
}

.appointment-page__header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  min-width: 0;
}

.appointment-page__header-action {
  flex: 0 0 auto;
}

.appointment-main {
  min-width: 0;
  display: grid;
  gap: 1rem;
}

.appointment-toolbar-card :deep(.el-card__body) {
  display: grid;
  gap: 0.45rem;
  padding: 0.55rem;
}

.appointment-toolbar {
  display: grid;
  gap: 0.35rem;
}

.appointment-toolbar__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  justify-content: space-between;
}

.appointment-toolbar__row--primary {
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
}

.appointment-day-nav {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.35rem;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
}

.appointment-toolbar__actions {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  gap: 0.4rem;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}

.appointment-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.appointment-day-nav__button {
  min-height: 2.35rem;
  border-radius: 999px;
}

.appointment-day-nav__picker {
  min-width: 10.5rem;
  flex: 0 1 10.5rem;
}

.appointment-search {
  min-width: 10.5rem;
  max-width: 16rem;
  flex: 1 1 11rem;
}

.appointment-toolbar__action {
  min-height: 2.35rem;
  border-radius: 999px;
}

.appointment-toolbar__action--segment {
  min-width: 3.9rem;
  padding-inline: 0.85rem;
}

.appointment-toolbar__action--filters {
  min-width: 6.2rem;
  padding-inline: 0.9rem;
}

.appointment-toolbar__action--primary {
  padding-inline: 1rem;
}

.appointment-filters-popover__content {
  display: grid;
  gap: 0.9rem;
}

.appointment-filters-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.appointment-filters-popover__eyebrow,
.appointment-filters-popover__label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-filters-popover__title {
  margin: 0.15rem 0 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-filters-popover__clear {
  min-height: 2.25rem;
  border-radius: 999px;
}

.appointment-filters-popover__section {
  display: grid;
  gap: 0.55rem;
}

.appointment-filters-popover__select {
  width: 100%;
}

.appointment-filters-popover__select :deep(.el-input__wrapper) {
  min-height: 2.65rem;
  border-radius: 999px;
}

.appointment-filters-popover__content :deep(.el-select) {
  width: 100%;
}

.appointment-status-row {
  align-items: center;
}

.appointment-status-chip {
  min-height: 2.2rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: #ffffff;
  color: #475569;
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.appointment-status-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, 0.9);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
}

.appointment-status-chip--active {
  border-color: rgba(59, 130, 246, 0.28);
  background: rgba(239, 246, 255, 1);
  color: #1d4ed8;
}

.appointment-next-strip {
  border: 1px solid rgba(226, 232, 240, 0.95);
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.85), rgba(255, 255, 255, 0.98)),
    #fff;
}

.appointment-next-strip :deep(.el-card__body) {
  padding: 0.9rem 1rem;
}

.appointment-next-strip__content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem 1rem;
  align-items: center;
  justify-content: space-between;
}

.appointment-next-strip__copy {
  min-width: 0;
  display: grid;
  gap: 0.2rem;
}

.appointment-next-strip__eyebrow {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-next-strip__name {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-next-strip__meta {
  color: #64748b;
  font-size: 0.88rem;
}

.appointment-next-strip__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.appointment-next-strip__button {
  min-height: 2.5rem;
  border-radius: 999px;
}

.appointment-kpi-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.appointment-kpi-card :deep(.el-card__body) {
  display: grid;
  align-content: space-between;
  gap: 0.25rem;
  min-height: 5.25rem;
}

.appointment-kpi-card__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-kpi-card__value {
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1;
  color: #0f172a;
}

.appointment-kpi-card--accent :deep(.el-card__body) {
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.98));
}

.appointment-table :deep(.el-table__cell) {
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
}

.appointment-table :deep(.appointment-table__status-cell) {
  padding-right: 1rem;
}

.appointment-table :deep(.appointment-table__actions-cell) {
  overflow: visible;
}

.appointment-table :deep(.cell) {
  line-height: 1.2;
}

@media (max-width: 1024px) {
  .appointment-table--past :deep(.el-table__cell) {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .appointment-table--past :deep(.cell) {
    font-size: 0.94rem;
    line-height: 1.15;
  }
}

.appointment-empty-state {
  display: grid;
  gap: 0.5rem;
  place-items: center;
  border-radius: 22px;
  border: 1px dashed #cbd5e1;
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 42%),
    #f8fafc;
  padding: 1.5rem;
  text-align: center;
  font-size: 0.95rem;
  color: #64748b;
}

.appointment-empty-state__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-empty-state__copy {
  margin: 0;
  max-width: 24rem;
}

.appointment-empty-state__button {
  min-height: 2.75rem;
  border-radius: 999px;
}

.appointment-empty-state::before {
  content: '📅';
  font-size: 1.6rem;
  line-height: 1;
}

:deep(.appointment-row--highlighted td) {
  background: rgba(249, 115, 22, 0.12) !important;
}

.appointment-dialog :deep(.el-dialog) {
  max-width: 760px;
  width: 92%;
}

.appointment-dialog :deep(.el-dialog__body) {
  padding-top: 20px;
  padding-bottom: 20px;
}

.appointment-dialog-form {
  margin-top: 0;
}

.appointment-dialog-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem 1rem;
}

.appointment-dialog-alert {
  border-radius: 18px;
}

.appointment-dialog-grid :deep(.el-form-item) {
  margin-bottom: 0;
}

.appointment-dialog-grid :deep(.el-textarea__inner) {
  min-height: 7rem;
}

.appointment-detail-drawer :deep(.el-drawer__body) {
  padding: 1rem;
}

.appointment-detail-drawer__content {
  display: grid;
  gap: 1rem;
}

.appointment-detail-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.appointment-detail-drawer__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-detail-drawer__title {
  margin: 0.15rem 0 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.appointment-detail-drawer__copy {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

.appointment-detail-drawer__close {
  color: #64748b;
}

.appointment-detail-drawer__status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.appointment-detail-drawer__details {
  display: grid;
  gap: 0.75rem;
}

.appointment-detail-drawer__details div {
  display: grid;
  gap: 0.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: #f8fafc;
}

.appointment-detail-drawer__details dt {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-detail-drawer__details dd {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: #0f172a;
}

.appointment-detail-drawer__notes {
  display: grid;
  gap: 0.45rem;
  padding: 0.9rem;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.98));
}

.appointment-detail-drawer__notes-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-detail-drawer__notes p {
  margin: 0;
  color: #0f172a;
  line-height: 1.5;
}

.appointment-detail-drawer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.appointment-detail-drawer__button {
  flex: 1 1 8rem;
  min-height: 2.7rem;
  border-radius: 999px;
}

@media (min-width: 720px) {
  .appointment-dialog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .appointment-dialog-grid__notes {
    grid-column: 1 / -1;
  }
}

@media (min-width: 768px) {
  .appointment-layout {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .appointment-toolbar__actions {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .appointment-toolbar-card :deep(.el-card__body) {
    padding: 0.75rem;
  }

  .appointment-page__header {
    width: 100%;
    flex-wrap: wrap;
  }

  .appointment-page__header-actions {
    width: 100%;
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .appointment-page__header-action {
    width: 100%;
    justify-content: center;
  }

  .appointment-day-nav {
    width: 100%;
  }

  .appointment-toolbar__actions {
    width: 100%;
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .appointment-day-nav__picker,
  .appointment-search,
  .appointment-toolbar__action {
    width: 100%;
  }

  .appointment-search {
    min-width: 0;
  }

  .appointment-toolbar__action,
  .appointment-day-nav__button {
    flex: 1 1 8rem;
  }

  .appointment-toolbar__actions .appointment-view-toggle {
    width: 100%;
  }

  .appointment-status-row {
    gap: 0.5rem;
  }

  .appointment-next-strip__actions,
  .appointment-detail-drawer__actions {
    width: 100%;
  }
}
</style>
