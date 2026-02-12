<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton, ElTag, ElMessage } from 'element-plus';
import {
  fetchQueue,
  assignToMe,
  startCheckIn,
  completeCheckIn,
  type QueueItem,
} from '../../api/queue';

const queue = ref<QueueItem[]>([]);
const loading = ref(false);
const actionLoading = ref<string | null>(null);

const loadQueue = async () => {
  loading.value = true;
  try {
    const res = await fetchQueue();
    if ((res as any).locked) {
      queue.value = [];
    } else if (Array.isArray(res)) {
      queue.value = res as QueueItem[];
    } else if ((res as any).items && Array.isArray((res as any).items)) {
      queue.value = (res as any).items as QueueItem[];
    } else {
      queue.value = [];
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load queue');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadQueue();
});

const handleAction = async (id: string, action: () => Promise<unknown>) => {
  actionLoading.value = id;
  try {
    await action();
    await loadQueue();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Action failed');
  } finally {
    actionLoading.value = null;
  }
};

const statusLabel = (status: QueueItem['status']) => {
  if (status === 'IN_SERVICE') return 'In Service';
  if (status === 'WAITING') return 'Waiting';
  if (status === 'COMPLETED') return 'Completed';
  return 'Canceled';
};

const statusType = (status: QueueItem['status']) => {
  if (status === 'IN_SERVICE') return 'warning';
  if (status === 'WAITING') return 'info';
  if (status === 'COMPLETED') return 'success';
  return 'danger';
};
</script>

<template>
  <div class="space-y-4">
    <div class="mb-2">
      <h1 class="text-xl font-semibold text-slate-900">Live Queue</h1>
      <p class="text-sm text-slate-600">Assign, start, and complete services.</p>
    </div>

    <div class="space-y-3">
      <ElCard
        v-for="item in queue"
        :key="item.id"
        shadow="hover"
        class="queue-card glass"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="text-lg font-semibold text-slate-900">
              {{ item.customerName }}
            </div>
            <div class="queue-phone">{{ item.customerPhone }}</div>
            <div>
              <div class="queue-service-name" :title="item.services?.map((s) => s.serviceName).join(', ') || item.serviceName || 'No service selected'">
                {{
                  (item.services && item.services[0]?.serviceName) ||
                  item.serviceName ||
                  'No service selected'
                }}
              </div>
              <div
                v-if="(item.services?.length || 0) > 1"
                class="queue-service-more"
              >
                +{{ (item.services?.length || 0) - 1 }} more
              </div>
            </div>
            <div class="text-sm text-slate-600">
              Staff: {{ item.staffName || 'Unassigned' }}
            </div>
          </div>
          <ElTag :type="statusType(item.status)" effect="light">
            {{ statusLabel(item.status) }}
          </ElTag>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <template v-if="item.status === 'WAITING'">
            <ElButton
              v-if="!item.staffName"
              size="large"
              type="primary"
              class="flex-1"
              :loading="actionLoading === item.id"
              @click="handleAction(item.id, () => assignToMe(item.id))"
            >
              Assign to me
            </ElButton>
            <ElButton
              size="large"
              type="success"
              class="flex-1"
              :loading="actionLoading === item.id"
              @click="handleAction(item.id, () => startCheckIn(item.id))"
            >
              Start service
            </ElButton>
          </template>

          <template v-else-if="item.status === 'IN_SERVICE'">
            <ElButton
              size="large"
              type="primary"
              class="flex-1"
              :loading="actionLoading === item.id"
              @click="handleAction(item.id, () => completeCheckIn(item.id))"
            >
              Complete
            </ElButton>
          </template>
        </div>
      </ElCard>

      <div v-if="!loading && queue.length === 0" class="text-center text-sm text-slate-500">
        No active check-ins.
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-card {
  border-radius: var(--card-radius, 14px);
}
.queue-card :deep(.el-card__body) {
  padding: 14px;
}
.queue-phone {
  font-size: 1.05rem;
  font-weight: 650;
  color: #0f172a;
}
.queue-service-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0f172a;
}
.queue-service-more {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
</style>
