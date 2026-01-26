<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElTag, ElMessage, ElButton } from 'element-plus';
import { listReviewRequests, type ReviewRequest } from '../../../api/reviews';

const loading = ref(false);
const requests = ref<ReviewRequest[]>([]);

const load = async () => {
  loading.value = true;
  try {
    requests.value = await listReviewRequests(100);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load requests');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const badgeType = (status: string) => {
  switch (status) {
    case 'sent':
      return 'success';
    case 'clicked':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Reviews</span>
      <span>/</span>
      <span>Requests</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Review Requests</h1>
        <p class="text-sm text-slate-600">Recent review invites and delivery status.</p>
      </div>
      <ElButton size="small" @click="load">Refresh</ElButton>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="requests" style="width: 100%">
        <ElTableColumn prop="created_at" label="Created" width="160" />
        <ElTableColumn prop="channel" label="Channel" width="90" />
        <ElTableColumn prop="status" label="Status" width="120">
          <template #default="{ row }">
            <ElTag :type="badgeType(row.status)">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="rating" label="Rating" width="100" />
        <ElTableColumn prop="sent_at" label="Sent At" width="160" />
        <ElTableColumn prop="clicked_at" label="Clicked At" width="160" />
        <ElTableColumn prop="error" label="Error" min-width="160" />
      </ElTable>
    </ElCard>
  </div>
</template>
