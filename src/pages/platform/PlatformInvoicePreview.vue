<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElButton, ElInput, ElMessage, ElTag } from 'element-plus';
import { fetchPlatformInvoicePreview } from '../../api/invoicePlatform';
import type { InvoiceEstimate } from '../../api/invoice';

const businessId = ref('');
const loading = ref(false);
const estimate = ref<InvoiceEstimate | null>(null);

const load = async () => {
  if (!businessId.value) {
    ElMessage.warning('Enter businessId');
    return;
  }
  loading.value = true;
  try {
    estimate.value = await fetchPlatformInvoicePreview(businessId.value);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load invoice');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Invoice Preview (Platform)</h1>
        <p class="text-sm text-slate-600">Read-only estimate for any tenant (no billing yet).</p>
      </div>
      <div class="flex gap-2">
        <ElInput v-model="businessId" placeholder="businessId" style="width: 260px" />
        <ElButton type="primary" :loading="loading" @click="load">Load</ElButton>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <div v-if="estimate">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-lg font-semibold">Month: {{ estimate.month }}</div>
          </div>
          <ElTag type="info">{{ estimate.plan }}</ElTag>
        </div>
        <ul class="text-sm text-slate-800 divide-y divide-slate-200">
          <li v-for="line in estimate.lines" :key="line.description + (line.detail || '')" class="py-1.5 flex justify-between">
            <div>
              <span class="font-medium">{{ line.description }}</span>
              <span v-if="line.detail" class="text-slate-500"> — {{ line.detail }}</span>
            </div>
            <div :class="line.amount < 0 ? 'text-emerald-700' : 'text-slate-900'">
              {{ line.amount < 0 ? '-' : '' }}${Math.abs(line.amount).toFixed(2)}
            </div>
          </li>
        </ul>
        <div class="mt-3 flex items-center justify-between text-base font-semibold text-slate-900">
          <span>Total (est.)</span>
          <span>${estimate.total.toFixed(2)} {{ estimate.currency }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-slate-600">Enter a businessId to view an estimate.</div>
    </ElCard>
  </div>
</template>
