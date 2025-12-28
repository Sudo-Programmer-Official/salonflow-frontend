<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElDatePicker,
  ElTimeSelect,
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
  type Appointment,
} from '../../api/appointments';
import { fetchServices, type ServiceItem } from '../../api/services';
import { fetchStaff, type StaffMember } from '../../api/staff';

const appointments = ref<Appointment[]>([]);
const services = ref<ServiceItem[]>([]);
const staff = ref<StaffMember[]>([]);
const loading = ref(false);
const loadingServices = ref(false);
const loadingStaff = ref(false);

const selectedDate = ref(new Date());

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const saving = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  customerName: '',
  phoneE164: '',
  serviceId: '',
  staffId: '',
  date: '',
  time: '',
  notes: '',
});

const resetForm = () => {
  form.customerName = '';
  form.phoneE164 = '';
  form.serviceId = '';
  form.staffId = '';
  form.date = formatDate(selectedDate.value);
  form.time = '';
  form.notes = '';
  editingId.value = null;
};

const formatDate = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (iso: string) => iso.slice(0, 10);
const toTime = (iso: string) => iso.slice(11, 16);

const loadAppointments = async () => {
  loading.value = true;
  try {
    appointments.value = await fetchAppointments({
      date: formatDate(selectedDate.value),
    });
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
    staff.value = await fetchStaff();
  } catch {
    staff.value = [];
  } finally {
    loadingStaff.value = false;
  }
};

onMounted(() => {
  form.date = formatDate(selectedDate.value);
  loadAppointments();
  loadServices();
  loadStaff();
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
  form.date = toDate(appt.scheduledAt);
  form.time = toTime(appt.scheduledAt);
  form.notes = appt.notes || '';
  dialogVisible.value = true;
};

const buildScheduledAt = () => {
  if (!form.date || !form.time) return '';
  return `${form.date}T${form.time}:00`;
};

const saveAppointment = async () => {
  if (!form.customerName || !form.phoneE164 || !form.serviceId || !form.date || !form.time) {
    ElMessage.warning('Name, phone, service, date, and time are required');
    return;
  }
  const scheduledAt = buildScheduledAt();
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
  try {
    await cancelAppointment(id);
    await loadAppointments();
    ElMessage.success('Appointment canceled');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Cancel failed');
  }
};

const handleComplete = async (id: string) => {
  try {
    await completeAppointment(id);
    await loadAppointments();
    ElMessage.success('Appointment completed');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Complete failed');
  }
};

const datePickerValue = computed({
  get: () => selectedDate.value,
  set: (val: Date) => {
    selectedDate.value = val;
    form.date = formatDate(val);
    loadAppointments();
  },
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Appointments</h1>
        <p class="text-sm text-slate-600">Create and manage appointments.</p>
      </div>
      <ElButton type="primary" @click="openCreate">New Appointment</ElButton>
    </div>

    <ElCard class="bg-white">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-base font-semibold text-slate-900">Selected Date</div>
        <ElDatePicker
          v-model="datePickerValue"
          type="date"
          placeholder="Select date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </div>

      <ElTable :data="appointments" :loading="loading" stripe>
        <ElTableColumn prop="customerName" label="Customer" min-width="140" />
        <ElTableColumn prop="phoneE164" label="Phone" min-width="120" />
        <ElTableColumn prop="serviceName" label="Service" min-width="140" />
        <ElTableColumn prop="staffName" label="Staff" min-width="120" />
        <ElTableColumn
          prop="scheduledAt"
          label="Time"
          min-width="110"
          :formatter="(_, __, val) => val.slice(11, 16)"
        />
        <ElTableColumn prop="status" label="Status" width="110" />
        <ElTableColumn label="Actions" width="220">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2">
              <ElButton size="small" type="primary" @click="openEdit(row)">Edit</ElButton>
              <ElButton size="small" type="danger" @click="handleCancel(row.id)">Cancel</ElButton>
              <ElButton
                v-if="row.status === 'BOOKED'"
                size="small"
                type="success"
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
            <ElTimeSelect
              v-model="form.time"
              start="08:00"
              step="00:15"
              end="20:00"
              placeholder="Select time"
            />
          </ElFormItem>
          <ElFormItem label="Notes">
            <ElInput v-model="form.notes" type="textarea" :rows="3" placeholder="Notes (optional)" />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="dialogVisible = false">Cancel</ElButton>
          <ElButton type="primary" :loading="saving" @click="saveAppointment">
            Save
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
