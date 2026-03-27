<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  fetchAppointments,
  type Appointment,
  updateAppointment,
} from '../../api/appointments';
import { fetchPublicSettings } from '../../api/settings';
import { fetchServices, type ServiceItem } from '../../api/services';
import { fetchStaff, type StaffMember } from '../../api/staff';
import { useAppointmentAlerts } from '../../composables/useAppointmentAlerts';
import {
  DEFAULT_TIMEZONE,
  dayjs,
  formatInBusinessTz,
  getBusinessTimezone,
  nowInBusinessTz,
  setBusinessTimezone,
} from '../../utils/dates';
import { formatPhone } from '../../utils/format';

type AppointmentDialogMode = 'create' | 'edit' | 'view';

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
  if (dialogMode.value === 'edit') return 'Edit Appointment';
  return 'Appointment Details';
});
const isViewMode = computed(() => dialogMode.value === 'view');
const saving = ref(false);
const editingId = ref<string | null>(null);
const completedPastVisibleCount = ref(COMPLETED_PAST_INCREMENT);

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

const currentTime = computed(() => {
  nowTick.value;
  return nowInBusinessTz(businessTimezone.value);
});

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

const isUpcomingAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  appointmentAtBusinessTime(appointment).isAfter(currentTime.value);

const isDerivedInProgressAppointment = (appointment: Appointment) =>
  !isPastResolvedAppointment(appointment) &&
  !appointmentAtBusinessTime(appointment).isAfter(currentTime.value);

const statusBadge = (status: string) => {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';

  switch (status) {
    case 'PENDING':
      return { label: 'Awaiting confirmation', cls: `${base} bg-amber-100 text-amber-800` };
    case 'CONFIRMED':
      return { label: 'Confirmed', cls: `${base} bg-emerald-100 text-emerald-800` };
    case 'CHECKED_IN':
      return { label: 'Checked in', cls: `${base} bg-sky-100 text-sky-800` };
    case 'COMPLETED':
      return { label: 'Completed', cls: `${base} bg-indigo-100 text-indigo-800` };
    case 'CANCELED':
      return { label: 'Cancelled', cls: `${base} bg-rose-100 text-rose-800` };
    case 'NO_SHOW':
      return { label: 'No show', cls: `${base} bg-gray-200 text-gray-700` };
    default:
      return { label: status, cls: `${base} bg-slate-100 text-slate-700` };
  }
};

const statusBadgeForAppointment = (appointment: Appointment) => {
  if (isDerivedInProgressAppointment(appointment)) {
    const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';
    return {
      label: 'In progress',
      cls: `${base} bg-orange-100 text-orange-800`,
    };
  }

  return statusBadge(appointment.status);
};

const appointmentGroups = computed<AppointmentGroup[]>(() => {
  const upcoming: Appointment[] = [];
  const inProgress: Appointment[] = [];
  const completedPast: Appointment[] = [];

  for (const appointment of appointments.value) {
    if (isPastResolvedAppointment(appointment)) {
      completedPast.push(appointment);
      continue;
    }

    if (isUpcomingAppointment(appointment)) {
      upcoming.push(appointment);
      continue;
    }

    inProgress.push(appointment);
  }

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
      description: 'Completed, no-show, and cancelled appointments remain visible for reference.',
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

const nextAppointment = computed(() => appointmentGroups.value[0]?.items[0] ?? null);
const appointmentsVisible = computed(() => appointments.value.length > 0);
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

const openCreate = () => {
  if (!canManageAppointments.value) {
    return;
  }

  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
};

const openEdit = (appointment: Appointment) => {
  if (!canManageAppointments.value) {
    return;
  }

  dialogMode.value = 'edit';
  applyAppointmentToForm(appointment);
  dialogVisible.value = true;
};

const openView = (appointment: Appointment) => {
  dialogMode.value = 'view';
  applyAppointmentToForm(appointment);
  dialogVisible.value = true;
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

const formatTime = (_: unknown, __: unknown, value: string) =>
  formatInBusinessTz(value, 'MMM D, h:mm A', businessTimezone.value);

const saveAppointment = async () => {
  if (isViewMode.value) {
    return;
  }

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

const appointmentRowClassName = ({ row }: { row: Appointment }) =>
  row.id === highlightedAppointmentId.value ? 'appointment-row--highlighted' : '';
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Appointments</h1>
        <p class="text-sm text-slate-600">
          {{
            canManageAppointments
              ? 'Appointments stay visible after their scheduled time so your team can track what is next and what still needs completion.'
              : 'Review and acknowledge appointments relevant to your schedule.'
          }}
        </p>
      </div>
      <ElButton
        v-if="canManageAppointments"
        type="primary"
        class="sf-btn"
        @click="openCreate"
      >
        New Appointment
      </ElButton>
    </div>

    <ElCard v-if="nextAppointment" class="appointment-next-card">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <div class="appointment-next-card__eyebrow">Next Appointment</div>
          <div class="text-2xl font-semibold text-slate-900">{{ nextAppointment.customerName }}</div>
          <div class="text-sm text-slate-600">
            {{ formatInBusinessTz(nextAppointment.scheduledAt, 'MMM D, YYYY h:mm A', businessTimezone) }}
            <span class="mx-2 text-slate-300">•</span>
            {{ nextAppointment.serviceName }}
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <ElButton class="sf-btn" @click="openView(nextAppointment)">View</ElButton>
          <ElButton
            v-if="canManageAppointments"
            type="primary"
            class="sf-btn"
            @click="openEdit(nextAppointment)"
          >
            Edit
          </ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard class="appointment-filter-card bg-white">
      <div class="appointment-filter-grid">
        <div class="appointment-date-tile">
          <div class="appointment-date-tile__row">
            <span class="appointment-date-tile__label">Selected Date</span>
            <ElDatePicker
              v-model="selectedDate"
              type="date"
              placeholder="All dates"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              size="small"
              class="appointment-date-picker"
            />
          </div>
        </div>
        <div
          v-for="group in appointmentGroups"
          :key="group.key"
          class="appointment-summary-tile"
        >
          <div class="appointment-summary-tile__label">
            {{ group.title }}
          </div>
          <div class="appointment-summary-tile__value">{{ group.items.length }}</div>
        </div>
      </div>
    </ElCard>

    <div v-if="!loading && !appointmentsVisible" class="appointment-empty-state">
      {{ emptyStateMessage }}
    </div>

    <div v-if="loading || appointmentsVisible">
      <div v-for="group in displayedAppointmentGroups" :key="group.key" class="space-y-2">
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
          stripe
        >
          <ElTableColumn prop="customerName" label="Customer" min-width="140" />
          <ElTableColumn label="Phone" min-width="140">
            <template #default="{ row }">
              <span>{{ formatPhone(row.phoneE164) }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="serviceName" label="Service" min-width="140" />
          <ElTableColumn prop="staffName" label="Staff" min-width="120" />
          <ElTableColumn prop="preferredTech" label="Preferred Tech" min-width="140" />
          <ElTableColumn
            prop="scheduledAt"
            label="Time"
            min-width="110"
            :formatter="formatTime"
          />
          <ElTableColumn prop="status" label="Status" width="150">
            <template #default="{ row }">
              <span :class="statusBadgeForAppointment(row).cls">
                {{ statusBadgeForAppointment(row).label }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Actions" min-width="360">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-2">
                <ElButton
                  size="small"
                  class="sf-btn sf-btn--table"
                  @click="openView(row)"
                  :disabled="actionLoading[row.id]"
                >
                  View
                </ElButton>
                <ElButton
                  v-if="canManageAppointments"
                  size="small"
                  type="primary"
                  class="sf-btn sf-btn--table"
                  @click="openEdit(row)"
                  :disabled="actionLoading[row.id]"
                >
                  Edit
                </ElButton>
                <ElButton
                  v-if="canManageAppointments && row.status !== 'CANCELED' && row.status !== 'COMPLETED'"
                  size="small"
                  type="danger"
                  class="sf-btn sf-btn--table"
                  :loading="actionLoading[row.id]"
                  @click="handleCancel(row.id)"
                >
                  Cancel
                </ElButton>
                <ElButton
                  v-if="canManageAppointments && row.status === 'PENDING'"
                  size="small"
                  type="success"
                  class="sf-btn sf-btn--table"
                  :loading="actionLoading[row.id]"
                  @click="handleConfirm(row.id)"
                >
                  Confirm
                </ElButton>
                <ElButton
                  v-if="canManageAppointments && (row.status === 'CONFIRMED' || row.status === 'CHECKED_IN')"
                  size="small"
                  type="success"
                  class="sf-btn sf-btn--table"
                  :loading="actionLoading[row.id]"
                  @click="handleComplete(row.id)"
                >
                  Complete
                </ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div
          v-else-if="!loading"
          class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500"
        >
          {{ group.emptyMessage }}
        </div>

        <div
          v-if="!loading && group.key === 'completed_past' && group.hasMore"
          class="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-sm text-slate-500">
            Showing {{ group.visibleCount }} of {{ group.totalCount }} appointments
          </div>
          <ElButton
            size="small"
            class="sf-btn"
            @click="loadMoreCompletedPast"
          >
            Load {{ Math.min(COMPLETED_PAST_INCREMENT, group.remainingCount) }} more
          </ElButton>
        </div>
      </ElCard>
      </div>
    </div>

    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <div class="space-y-4">
        <ElForm label-position="top" class="space-y-4">
          <ElFormItem label="Customer name" required>
            <ElInput
              v-model="form.customerName"
              placeholder="Customer name"
              :disabled="isViewMode"
            />
          </ElFormItem>
          <ElFormItem label="Phone number" required>
            <ElInput
              v-model="form.phoneE164"
              placeholder="+1 555 123 4567"
              :disabled="isViewMode"
            />
          </ElFormItem>
          <ElFormItem label="Service" required>
            <ElSelect
              v-model="form.serviceId"
              placeholder="Select service"
              filterable
              :disabled="isViewMode"
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
              :disabled="isViewMode"
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
            <ElInput
              v-model="form.preferredTech"
              placeholder="e.g. Alex (nails)"
              :disabled="isViewMode"
            />
          </ElFormItem>
          <ElFormItem label="Date" required>
            <ElDatePicker
              v-model="form.date"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="YYYY-MM-DD"
              :disabled="isViewMode"
            />
          </ElFormItem>
          <ElFormItem label="Time" required>
            <ElSelect
              v-model="form.time"
              placeholder="Select time"
              filterable
              :disabled="isViewMode"
            >
              <ElOption
                v-for="slot in timeSlots"
                :key="slot.value"
                :label="slot.label"
                :value="slot.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Notes">
            <ElInput
              v-model="form.notes"
              type="textarea"
              :rows="3"
              placeholder="Notes (optional)"
              :disabled="isViewMode"
            />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton class="sf-btn" @click="dialogVisible = false">
            {{ isViewMode ? 'Close' : 'Cancel' }}
          </ElButton>
          <ElButton
            v-if="!isViewMode"
            type="primary"
            class="sf-btn"
            :loading="saving"
            @click="saveAppointment"
          >
            Save
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.appointment-next-card {
  border: 1px solid rgba(251, 146, 60, 0.18);
  background:
    linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.98)),
    white;
}

.appointment-next-card__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c2410c;
}

.appointment-filter-card :deep(.el-card__body) {
  padding: 1rem 1.1rem;
}

.appointment-filter-grid {
  display: grid;
  gap: 0.75rem;
}

.appointment-date-tile,
.appointment-summary-tile {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  min-height: 4.5rem;
}

.appointment-date-tile {
  padding: 0.75rem 1rem;
}

.appointment-date-tile__row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.appointment-date-tile__label,
.appointment-summary-tile__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
}

.appointment-summary-tile {
  padding: 0.75rem 0.9rem;
  text-align: center;
}

.appointment-summary-tile__value {
  margin-top: 0.35rem;
  font-size: 1.8rem;
  line-height: 1;
  font-weight: 700;
  color: #0f172a;
}

.appointment-date-picker {
  width: 100%;
}

.appointment-date-picker :deep(.el-input__wrapper) {
  min-height: 2.2rem;
  border-radius: 9999px;
}

.appointment-date-picker :deep(.el-input__inner) {
  font-size: 0.95rem;
}

.appointment-date-picker :deep(.el-input__prefix) {
  color: #94a3b8;
}

.appointment-empty-state {
  border-radius: 18px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  padding: 1.25rem;
  text-align: center;
  font-size: 0.95rem;
  color: #64748b;
}

:deep(.appointment-row--highlighted td) {
  background: rgba(249, 115, 22, 0.12) !important;
}

@media (min-width: 768px) {
  .appointment-filter-grid {
    grid-template-columns: minmax(16rem, 1.75fr) repeat(3, minmax(0, 1fr));
    align-items: stretch;
  }

  .appointment-date-tile__row {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }

  .appointment-date-picker {
    min-width: 11rem;
  }
}

@media (max-width: 640px) {
  .appointment-filter-card :deep(.el-card__body) {
    padding: 0.9rem;
  }

  .appointment-date-tile,
  .appointment-summary-tile {
    min-height: auto;
  }
}
</style>
