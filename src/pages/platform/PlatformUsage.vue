<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElDatePicker, ElButton, ElMessage } from 'element-plus';
import { fetchGrowthUsage, startGrowthTrial } from '../../api/platform';

const businessId = ref('');
const month = ref<string>(new Date().toISOString().slice(0, 10).replace(/\d{2}$/, '01'));
const loading = ref(false);
const usage = ref<Array<{ month: string; metric_key: string; count: number }>>([]);
const trialLoading = ref(false);

const load = async () => {
  if (!businessId.value) {
    ElMessage.warning('Enter businessId');
    return;
  }
  loading.value = true;
  try {
    usage.value = await fetchGrowthUsage(businessId.value, month.value);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load usage');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const today = new Date();
  const isoMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  month.value = isoMonthStart;
});

const startTrial = async () => {
  if (!businessId.value) {
    ElMessage.warning('Enter businessId');
    return;
  }
  trialLoading.value = true;
  try {
    await startGrowthTrial(businessId.value);
    ElMessage.success('Growth trial started');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to start trial');
  } finally {
    trialLoading.value = false;
    load();
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Growth Usage</h1>
        <p class="text-sm text-slate-600">Review, social, Google sync usage by month.</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="businessId"
          placeholder="businessId"
          class="rounded border px-2 py-1 text-sm border-slate-300"
          style="min-width: 260px"
        />
        <ElDatePicker
          v-model="month"
          type="month"
          placeholder="Month"
          style="width: 150px"
          format="YYYY-MM"
          value-format="YYYY-MM-01"
        />
        <ElButton size="small" @click="load" :loading="loading">Load</ElButton>
        <ElButton size="small" type="primary" @click="startTrial" :loading="trialLoading">Start 14d Trial</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElTable :data="usage" style="width: 100%">
        <ElTableColumn prop="metric_key" label="Metric" width="200" />
        <ElTableColumn prop="count" label="Count" width="120" />
      </ElTable>
    </ElCard>
  </div>
</template>
