<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElTag, ElButton, ElMessage } from 'element-plus';
import { listUpgradeRequests, approveUpgradeRequest, rejectUpgradeRequest } from '../../api/upgradeRequests';

const loading = ref(false);
const requests = ref<any[]>([]);
const actionLoading = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  try {
    requests.value = await listUpgradeRequests();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load requests');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const approve = async (id: string) => {
  actionLoading.value = id;
  try {
    await approveUpgradeRequest(id);
    ElMessage.success('Approved and applied');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Approve failed');
  } finally {
    actionLoading.value = null;
  }
};

const reject = async (id: string) => {
  actionLoading.value = id;
  try {
    await rejectUpgradeRequest(id);
    ElMessage.success('Rejected');
    await load();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Reject failed');
  } finally {
    actionLoading.value = null;
  }
};

const badgeType = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'warning';
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Upgrade Requests</h1>
        <p class="text-sm text-slate-600">Approve or reject tenant upgrade requests.</p>
      </div>
      <ElButton size="small" @click="load">Refresh</ElButton>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="requests" style="width: 100%">
        <ElTableColumn prop="business_id" label="Business" width="230" />
        <ElTableColumn prop="current_plan" label="Current" width="140" />
        <ElTableColumn prop="requested_plan" label="Requested" width="150" />
        <ElTableColumn prop="status" label="Status" width="140">
          <template #default="{ row }">
            <ElTag :type="badgeType(row.status)">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="Requested At" width="200" />
        <ElTableColumn label="Actions" width="220">
          <template #default="{ row }">
            <ElButton
              size="small"
              type="primary"
              plain
              :loading="actionLoading === row.id"
              @click="approve(row.id)"
              :disabled="row.status === 'completed'"
            >
              Approve
            </ElButton>
            <ElButton
              size="small"
              type="danger"
              plain
              :loading="actionLoading === row.id"
              @click="reject(row.id)"
              :disabled="row.status === 'completed' || row.status === 'rejected'"
            >
              Reject
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
