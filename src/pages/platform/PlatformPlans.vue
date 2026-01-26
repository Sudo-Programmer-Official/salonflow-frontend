<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElSelect, ElOption, ElButton, ElMessage } from 'element-plus';
import { apiUrl, buildHeaders } from '../../api/client';

const businessId = ref('');
const plan = ref<'CORE' | 'GROWTH_STARTER' | 'GROWTH_PRO' | 'GROWTH_MAX'>('CORE');
const applying = ref(false);

const applyPlan = async () => {
  if (!businessId.value) {
    ElMessage.warning('Enter businessId');
    return;
  }
  applying.value = true;
  try {
    const res = await fetch(apiUrl('/platform/plans/apply'), {
      method: 'POST',
      headers: buildHeaders({ auth: true, json: true }),
      body: JSON.stringify({ businessId: businessId.value, plan_key: plan.value }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to apply plan');
    ElMessage.success('Plan applied');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to apply plan');
  } finally {
    applying.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Apply Plan</h1>
        <p class="text-sm text-slate-600">Set plan presets and feature flags in one click.</p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="businessId"
          placeholder="businessId"
          class="rounded border px-2 py-1 text-sm border-slate-300"
          style="min-width: 260px"
        />
        <ElSelect v-model="plan" style="width: 220px">
          <ElOption label="CORE" value="CORE" />
          <ElOption label="Growth Starter" value="GROWTH_STARTER" />
          <ElOption label="Growth Pro" value="GROWTH_PRO" />
          <ElOption label="Growth Max" value="GROWTH_MAX" />
        </ElSelect>
        <ElButton type="primary" :loading="applying" @click="applyPlan">Apply</ElButton>
      </div>
    </div>
    <ElCard shadow="never" class="border border-slate-200">
      <div class="text-sm text-slate-700">
        Plans map to feature presets:
        <ul class="list-disc ml-5 mt-2 space-y-1">
          <li><strong>CORE:</strong> All growth features off.</li>
          <li><strong>GROWTH_STARTER:</strong> Reviews + Google sync on.</li>
          <li><strong>GROWTH_PRO:</strong> Starter + Social (8/mo).</li>
          <li><strong>GROWTH_MAX:</strong> Pro + AI + Social (20/mo).</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>
