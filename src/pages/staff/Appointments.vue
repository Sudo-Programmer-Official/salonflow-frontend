<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElMessage } from 'element-plus';
import {
  fetchAppointments,
  completeAppointment,
  type Appointment,
} from '../../api/appointments';

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
        <ElTableColumn prop="phoneE164" label="Phone" min-width="120" />
        <ElTableColumn prop="serviceName" label="Service" min-width="140" />
        <ElTableColumn
          prop="scheduledAt"
          label="Time"
          min-width="100"
          :formatter="(_, __, val) => val.slice(11, 16)"
        />
        <ElTableColumn prop="status" label="Status" width="110" />
        <ElTableColumn label="Actions" width="140">
          <template #default="{ row }">
            <ElButton
              v-if="row.status === 'BOOKED'"
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
