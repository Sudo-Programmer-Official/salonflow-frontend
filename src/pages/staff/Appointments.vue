<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElMessage } from 'element-plus';
import {
  fetchAppointments,
  completeAppointment,
  type Appointment,
} from '../../api/appointments';
import { formatInBusinessTz } from '../../utils/dates';
import { formatPhone } from '../../utils/format';

const appointments = ref<Appointment[]>([]);
const loading = ref(false);
const actionLoading = ref<string | null>(null);

const loadAppointments = async () => {
  loading.value = true;
  try {
    appointments.value = await fetchAppointments({ mine: true });
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load appointments');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadAppointments();
});

const markComplete = async (id: string) => {
  actionLoading.value = id;
  try {
    await completeAppointment(id);
    await loadAppointments();
    ElMessage.success('Marked completed');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to complete');
  } finally {
    actionLoading.value = null;
  }
};

const formatTime = (_: unknown, __: unknown, val: string) =>
  formatInBusinessTz(val, 'MMM D, h:mm A');

const statusBadge = (status: string) => {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', cls: `${base} bg-amber-100 text-amber-800` };
    case 'CONFIRMED':
      return { label: 'Confirmed', cls: `${base} bg-emerald-100 text-emerald-800` };
    case 'CHECKED_IN':
      return { label: 'Checked in', cls: `${base} bg-sky-100 text-sky-800` };
    case 'COMPLETED':
      return { label: 'Completed', cls: `${base} bg-indigo-100 text-indigo-800` };
    case 'CANCELED':
      return { label: 'Cancelled', cls: `${base} bg-rose-100 text-rose-800` };
    default:
      return { label: status, cls: `${base} bg-slate-100 text-slate-700` };
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">My Appointments</h1>
      <p class="text-sm text-slate-600">Today’s assignments.</p>
    </div>

    <ElCard class="bg-white">
      <ElTable :data="appointments" :loading="loading" stripe>
        <ElTableColumn prop="customerName" label="Customer" min-width="140" />
        <ElTableColumn label="Phone" min-width="140">
          <template #default="{ row }">
            <span>{{ formatPhone(row.phoneE164) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="serviceName" label="Service" min-width="140" />
        <ElTableColumn
          prop="scheduledAt"
          label="Time"
          min-width="100"
          :formatter="formatTime"
        />
        <ElTableColumn prop="status" label="Status" width="140">
          <template #default="{ row }">
            <span :class="statusBadge(row.status).cls">{{ statusBadge(row.status).label }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Actions" width="140">
          <template #default="{ row }">
            <ElButton
              v-if="row.status === 'CONFIRMED' || row.status === 'CHECKED_IN'"
              size="small"
              type="primary"
              :loading="actionLoading === row.id"
              @click="markComplete(row.id)"
            >
              Complete
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="!loading && appointments.length === 0" class="py-6 text-center text-sm text-slate-500">
        No appointments assigned today.
      </div>
    </ElCard>
  </div>
</template>
