<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from 'vue';
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElDatePicker,
  ElDialog,
  ElSelect,
  ElOption,
  ElMessage,
} from 'element-plus';
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  type Appointment,
} from '../../api/appointments';
import { fetchServices, type ServiceItem } from '../../api/services';
import { fetchStaff, type StaffMember } from '../../api/staff';
import { formatInBusinessTz, dayjs, getBusinessTimezone } from '../../utils/dates';
import { formatPhone } from '../../utils/format';

const PAGE_SIZE = 10;
const appointments = ref<Appointment[]>([]);
const services = ref<ServiceItem[]>([]);
const staff = ref<StaffMember[]>([]);
const loading = ref(false);
const loadingServices = ref(false);
const loadingStaff = ref(false);
const actionLoading = ref<Record<string, boolean>>({});
const page = ref(1);
const totalPages = ref(1);

const selectedDate = ref(dayjs().tz(getBusinessTimezone()).format('YYYY-MM-DD'));

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const saving = ref(false);
const editingId = ref<string | null>(null);

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

const timeSlots = computed(() => {
  const slots: { label: string; value: string }[] = [];
  const startHour = 8;
  const endHour = 20;
  for (let h = startHour; h <= endHour; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      if (h === endHour && m > 0) break; // cap at end hour
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const label = dayjs(`2000-01-01T${value}`).format('h:mm A');
      slots.push({ label, value });
    }
  }
  return slots;
});

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

const formatDate = (d: Date | string) => {
  const zone = getBusinessTimezone();
  if (d instanceof Date) return dayjs(d).tz(zone).format('YYYY-MM-DD');
  if (typeof d === 'string' && d.length >= 10) {
    const parsed = dayjs.tz(d, zone);
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

const loadAppointments = async () => {
  loading.value = true;
  try {
    appointments.value = await fetchAppointments({
      date: selectedDate.value,
    });
    totalPages.value = Math.max(1, Math.ceil(appointments.value.length / PAGE_SIZE));
    if (page.value > totalPages.value) page.value = totalPages.value;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load appointments');
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
    const res = await fetchStaff();
    staff.value = res.items;
  } catch {
    staff.value = [];
  } finally {
    loadingStaff.value = false;
  }
};

onMounted(() => {
  form.date = selectedDate.value;
  loadAppointments();
  loadServices();
  loadStaff();
});

watch(selectedDate, () => {
  form.date = selectedDate.value;
  page.value = 1;
  loadAppointments();
});

const openCreate = () => {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
};

const openEdit = (appt: Appointment) => {
  dialogMode.value = 'edit';
  editingId.value = appt.id;
  form.customerName = appt.customerName;
  form.phoneE164 = appt.phoneE164;
  form.serviceId = appt.serviceId || '';
  form.staffId = appt.staffId || '';
  form.preferredTech = appt.preferredTech || '';
  form.date = toDate(appt.scheduledAt);
  form.time = toTime(appt.scheduledAt);
  form.notes = appt.notes || '';
  dialogVisible.value = true;
};

const buildScheduledAt = () => {
  if (!form.date || !form.time) return '';
  const zone = getBusinessTimezone();
  const composed = dayjs.tz(`${form.date}T${form.time}:00`, zone);
  return composed.isValid() ? composed.utc().toISOString() : '';
};

const formatTime = (_: unknown, __: unknown, val: string) =>
  formatInBusinessTz(val, 'MMM D, h:mm A');

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
    await loadAppointments();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Save failed');
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
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Cancel failed');
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
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Complete failed');
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
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Confirm failed');
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

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Appointments</h1>
        <p class="text-sm text-slate-600">Create and manage appointments.</p>
      </div>
      <ElButton type="primary" class="sf-btn" @click="openCreate">New Appointment</ElButton>
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
          <ElTable :data="displayedAppointments" :loading="loading" stripe>
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
            <ElTableColumn prop="status" label="Status" width="110" />
            <ElTableColumn label="Actions" min-width="300">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-2">
                  <ElButton
                    size="small"
                    type="primary"
                    class="sf-btn sf-btn--table"
                    @click="openEdit(row)"
                    :disabled="actionLoading[row.id]"
                  >
                    Edit
                  </ElButton>
                  <ElButton
                    v-if="row.status !== 'CANCELED' && row.status !== 'COMPLETED'"
                    size="small"
                    type="danger"
                    class="sf-btn sf-btn--table"
                    :loading="actionLoading[row.id]"
                    @click="handleCancel(row.id)"
                  >
                    Cancel
                  </ElButton>
                  <ElButton
                    v-if="row.status === 'BOOKED'"
                    size="small"
                    type="success"
                    class="sf-btn sf-btn--table"
                    :loading="actionLoading[row.id]"
                    @click="handleConfirm(row.id)"
                  >
                    Confirm
                  </ElButton>
                  <ElButton
                    v-if="row.status === 'CHECKED_IN'"
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
        No appointments for this date.
      </div>
        </div>
        <div class="pagination-footer">
          <ElButton size="small" plain class="sf-btn sf-btn--table" :disabled="page <= 1" @click="goToPage(1)">«</ElButton>
          <ElButton size="small" plain class="sf-btn sf-btn--table" :disabled="page <= 1" @click="changePage('prev')">Prev</ElButton>
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

    <ElDialog v-model="dialogVisible" :title="dialogMode === 'create' ? 'New Appointment' : 'Edit Appointment'" width="480px">
      <div class="space-y-4">
        <ElForm label-position="top" class="space-y-4">
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
              <ElOption v-for="svc in services" :key="svc.id" :label="svc.name" :value="svc.id" />
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
              <ElOption v-for="member in staff" :key="member.id" :label="member.name" :value="member.id" />
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
              <ElOption v-for="slot in timeSlots" :key="slot.value" :label="slot.label" :value="slot.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Notes">
            <ElInput v-model="form.notes" type="textarea" :rows="3" placeholder="Notes (optional)" />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton class="sf-btn" @click="dialogVisible = false">Cancel</ElButton>
          <ElButton type="primary" class="sf-btn" :loading="saving" @click="saveAppointment">
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
</style>
