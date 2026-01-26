<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElTag, ElButton, ElMessage } from 'element-plus';
import { listReviewFeedback, type ReviewFeedback } from '../../../api/reviews';

const loading = ref(false);
const feedback = ref<ReviewFeedback[]>([]);

const load = async () => {
  loading.value = true;
  try {
    feedback.value = await listReviewFeedback(100);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load feedback');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Reviews</span>
      <span>/</span>
      <span>Feedback</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Feedback</h1>
        <p class="text-sm text-slate-600">Internal feedback captured from low-star responses.</p>
      </div>
      <ElButton size="small" @click="load">Refresh</ElButton>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="feedback" style="width: 100%">
        <ElTableColumn prop="created_at" label="Received" width="160" />
        <ElTableColumn prop="rating" label="Rating" width="90">
          <template #default="{ row }">
            <ElTag>{{ row.rating ?? '—' }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="source" label="Source" width="120" />
        <ElTableColumn prop="locale" label="Locale" width="100" />
        <ElTableColumn prop="feedback" label="Feedback" min-width="240" />
      </ElTable>
    </ElCard>
  </div>
</template>
