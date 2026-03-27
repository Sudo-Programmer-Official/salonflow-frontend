<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import { fetchServices, type ServiceItem } from '../../api/services';
import { fetchStaff, type StaffMember } from '../../api/staff';
import { useAppointmentAlerts } from '../../composables/useAppointmentAlerts';
import { dayjs, formatInBusinessTz, getBusinessTimezone } from '../../utils/dates';
import { formatPhone } from '../../utils/format';

type AppointmentDialogMode = 'create' | 'edit' | 'view';

const PAGE_SIZE = 10;

const route = useRoute();
const router = useRouter();

const role = computed(() => localStorage.getItem('role') || '');
const isStaff = computed(() => role.value === 'STAFF');
const canManageAppointments = computed(() => role.value === 'OWNER');

const initialTargetDate =
  typeof route.query.appointmentDate === 'string' ? route.query.appointmentDate : null;

const appointments = ref<Appointment[]>([]);
const services = ref<ServiceItem[]>([]);
const staff = ref<StaffMember[]>([]);
const loading = ref(false);
const loadingServices = ref(false);
const loadingStaff = ref(false);
const actionLoading = ref<Record<string, boolean>>({});
const page = ref(1);
const totalPages = ref(1);
const highlightedAppointmentId = ref<string | null>(null);

const selectedDate = ref(
  initialTargetDate || dayjs().tz(getBusinessTimezone()).format('YYYY-MM-DD'),
);

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
  const zone = getBusinessTimezone();

  if (value instanceof Date) {
    return dayjs(value).tz(zone).format('YYYY-MM-DD');
  }

  if (typeof value === 'string' && value.length >= 10) {
    const parsed = dayjs.tz(value, zone);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
  }

  return '';
};

const toDate = (iso: string) => {
  const zone = getBusinessTimezone();
  const parsed = dayjs.tz(iso, zone);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

const toTime = (iso: string) => {
  const zone = getBusinessTimezone();
  const parsed = dayjs.tz(iso, zone);
  return parsed.isValid() ? parsed.format('HH:mm') : '';
};

const resetForm = () => {
  form.customerName = '';
  form.phoneE164 = '';
  form.serviceId = '';
  form.staffId = '';
  form.preferredTech = '';
  form.date = formatDate(selectedDate.value);
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
  const appointmentDate =
    typeof route.query.appointmentDate === 'string' ? route.query.appointmentDate : null;
  const shouldOpenFromAlert = route.query.alert === '1';

  if (!appointmentId || consumingRouteTarget) {
    return;
  }

  if (appointmentDate && appointmentDate !== selectedDate.value) {
    return;
  }

  const appointmentIndex = sourceAppointments.findIndex(
    (appointment) => appointment.id === appointmentId,
  );

  if (appointmentIndex === -1) {
    return;
  }

  consumingRouteTarget = true;

  try {
    const appointment = sourceAppointments[appointmentIndex];
    if (!appointment) {
      return;
    }

    highlightedAppointmentId.value = appointmentId;
    page.value = Math.floor(appointmentIndex / PAGE_SIZE) + 1;

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
    totalPages.value = Math.max(1, Math.ceil(appointments.value.length / PAGE_SIZE));
    if (page.value > totalPages.value) {
      page.value = totalPages.value;
    }

    await consumeRouteAppointmentTarget(nextAppointments);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to load appointments');
  } finally {
    loading.value = false;
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

onMounted(() => {
  form.date = selectedDate.value;
  void loadAppointments();
  void loadServices();
  void loadStaff();
});

watch(selectedDate, () => {
  form.date = selectedDate.value;
  page.value = 1;
  highlightedAppointmentId.value = null;
  void loadAppointments();
});

watch(
  () => [route.query.appointmentId, route.query.appointmentDate, route.query.alert],
  ([, nextAppointmentDate]) => {
    if (typeof nextAppointmentDate === 'string' && nextAppointmentDate !== selectedDate.value) {
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

  const zone = getBusinessTimezone();
  const composed = dayjs.tz(`${form.date}T${form.time}:00`, zone);
  return composed.isValid() ? composed.utc().toISOString() : '';
};

const formatTime = (_: unknown, __: unknown, value: string) =>
  formatInBusinessTz(value, 'MMM D, h:mm A');

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

const displayedAppointments = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return appointments.value.slice(start, start + PAGE_SIZE);
});

const changePage = (direction: 'prev' | 'next') => {
  const target = direction === 'next' ? page.value + 1 : page.value - 1;
  page.value = Math.min(Math.max(1, target), totalPages.value);
};

const goToPage = (target: number) => {
  page.value = Math.min(Math.max(1, target), totalPages.value);
};

const appointmentRowClassName = ({ row }: { row: Appointment }) =>
  row.id === highlightedAppointmentId.value ? 'appointment-row--highlighted' : '';
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Appointments</h1>
        <p class="text-sm text-slate-600">
          {{
            canManageAppointments
              ? 'Create and manage appointments.'
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

    <ElCard class="bg-white">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-base font-semibold text-slate-900">Selected Date</div>
        <ElDatePicker
          v-model="selectedDate"
          type="date"
          placeholder="Select date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </div>

      <div class="table-shell">
        <div class="table-body">
          <ElTable
            :data="displayedAppointments"
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
                <span :class="statusBadge(row.status).cls">{{ statusBadge(row.status).label }}</span>
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

          <div v-if="!loading && appointments.length === 0" class="py-6 text-center text-sm text-slate-500">
            {{ isStaff ? 'No appointments assigned for this date.' : 'No appointments for this date.' }}
          </div>
        </div>
        <div class="pagination-footer">
          <ElButton
            size="small"
            plain
            class="sf-btn sf-btn--table"
            :disabled="page <= 1"
            @click="goToPage(1)"
          >
            «
          </ElButton>
          <ElButton
            size="small"
            plain
            class="sf-btn sf-btn--table"
            :disabled="page <= 1"
            @click="changePage('prev')"
          >
            Prev
          </ElButton>
          <div class="page-indicator">Page {{ page }} of {{ totalPages }}</div>
          <ElButton
            size="small"
            plain
            :disabled="page >= totalPages"
            class="sf-btn sf-btn--table"
            @click="changePage('next')"
          >
            Next
          </ElButton>
        </div>
      </div>
    </ElCard>

    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <div class="space-y-4">
        <ElForm label-position="top" class="space-y-4">
          <ElFormItem label="Customer name" required>
            <ElInput v-model="form.customerName" placeholder="Customer name" :disabled="isViewMode" />
          </ElFormItem>
          <ElFormItem label="Phone number" required>
            <ElInput v-model="form.phoneE164" placeholder="+1 555 123 4567" :disabled="isViewMode" />
          </ElFormItem>
          <ElFormItem label="Service" required>
            <ElSelect
              v-model="form.serviceId"
              placeholder="Select service"
              filterable
              :disabled="isViewMode"
              :loading="loadingServices"
            >
              <ElOption v-for="service in services" :key="service.id" :label="service.name" :value="service.id" />
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
              <ElOption v-for="member in staff" :key="member.id" :label="member.name" :value="member.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Preferred tech (optional)">
            <ElInput v-model="form.preferredTech" placeholder="e.g. Alex (nails)" :disabled="isViewMode" />
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
              <ElOption v-for="slot in timeSlots" :key="slot.value" :label="slot.label" :value="slot.value" />
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
.table-shell {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.table-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: 12px;
}

.pagination-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-size: 13px;
  color: #475569;
  padding: 6px 10px;
  border-radius: 12px;
  background: #f1f5f9;
}

:deep(.appointment-row--highlighted td) {
  background: rgba(249, 115, 22, 0.12) !important;
}
</style>
