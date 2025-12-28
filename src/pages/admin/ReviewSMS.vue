<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElSwitch, ElAlert, ElButton } from 'element-plus';
import { fetchReviewSmsSettings, updateReviewSmsSettings } from '../../api/reviewSms';

const enabled = ref(false);
const loading = ref(false);
const saving = ref(false);
const success = ref('');
const error = ref('');

const loadSettings = async () => {
  loading.value = true;
  try {
    const data = await fetchReviewSmsSettings();
    enabled.value = data.enabled;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadSettings();
});

const handleSave = async () => {
  saving.value = true;
  success.value = '';
  error.value = '';
  try {
    await updateReviewSmsSettings(enabled.value);
    success.value = 'Settings saved.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save settings';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Automated Review SMS</h1>
      <p class="text-sm text-slate-600">
        Sends one Google review request after a service is completed, only with customer consent.
      </p>
    </div>

    <ElCard class="bg-white space-y-4" :loading="loading">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">Enable automated review request SMS</div>
          <div class="text-xs text-slate-600">
            Messages are sent only to customers who explicitly consent.
          </div>
        </div>
        <ElSwitch v-model="enabled" size="large" />
      </div>

      <ElAlert
        title="When a check-in is marked COMPLETED, a single review SMS is sent (one per visit). No reminders, no automation beyond this trigger."
        type="info"
        :closable="false"
        class="w-full"
      />

      <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div class="text-sm font-semibold text-slate-900">Sample message</div>
        <div class="text-sm text-slate-800 whitespace-pre-line">
          Thanks for visiting MTV Nails! We'd love your feedback: https://g.page/r/example
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <ElButton type="primary" :loading="saving" @click="handleSave">Save</ElButton>
      </div>

      <ElAlert
        v-if="success"
        type="success"
        :title="success"
        :closable="false"
        class="w-full"
      />
      <ElAlert
        v-if="error"
        type="error"
        :title="error"
        :closable="false"
        class="w-full"
      />
    </ElCard>
  </div>
</template>
