<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElCard, ElButton, ElMessage } from 'element-plus';
import { fetchQueue, type QueueItem } from '../../api/queue';
import { useRouter } from 'vue-router';

const router = useRouter();
const queue = ref<QueueItem[]>([]);
const loading = ref(false);

const loadQueue = async () => {
  loading.value = true;
  try {
    queue.value = await fetchQueue();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'Failed to load queue');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadQueue();
});

const waitingCount = computed(
  () => queue.value.filter((q) => q.status === 'WAITING').length,
);
const inServiceCount = computed(
  () => queue.value.filter((q) => q.status === 'IN_SERVICE').length,
);
const completedCount = computed(
  () => queue.value.filter((q) => q.status === 'COMPLETED').length,
);

const navigate = (name: string) => {
  router.push({ name });
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p class="mt-1 text-sm text-slate-600">
        Today’s overview and quick actions.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ElCard class="bg-white">
        <div class="text-sm text-slate-500">Waiting</div>
        <div class="mt-2 text-3xl font-semibold text-slate-900">
          {{ waitingCount }}
        </div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-sm text-slate-500">In Service</div>
        <div class="mt-2 text-3xl font-semibold text-slate-900">
          {{ inServiceCount }}
        </div>
      </ElCard>
      <ElCard class="bg-white">
        <div class="text-sm text-slate-500">Completed Today</div>
        <div class="mt-2 text-3xl font-semibold text-slate-900">
          {{ completedCount }}
        </div>
      </ElCard>
    </div>

    <ElCard class="bg-white">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-base font-semibold text-slate-900">Quick Links</div>
          <div class="text-sm text-slate-600">Jump to common admin tasks.</div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <ElButton type="primary" @click="navigate('admin-services')">Manage Services</ElButton>
          <ElButton @click="navigate('admin-staff')">Manage Staff</ElButton>
          <ElButton @click="navigate('admin-qr')">Print QR Code</ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>
