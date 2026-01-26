<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElButton, ElInput, ElMessage } from 'element-plus';
import { fetchPlatformAlertEmails, savePlatformAlertEmails } from '../../api/platformSettings';

const emails = ref('');
const loading = ref(false);
const saving = ref(false);

const load = async () => {
  loading.value = true;
  try {
    const list = await fetchPlatformAlertEmails();
    emails.value = list.join(', ');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const save = async () => {
  saving.value = true;
  try {
    await savePlatformAlertEmails(emails.value);
    ElMessage.success('Saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Alert Emails</h1>
      <p class="text-sm text-slate-600">Recipients for platform alerts (upgrade requests, etc.).</p>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <div class="space-y-3">
        <label class="text-sm font-semibold text-slate-800">Platform alert emails</label>
        <ElInput
          v-model="emails"
          type="textarea"
          :rows="3"
          placeholder="you@company.com, ops@company.com"
        />
        <div class="flex justify-end">
          <ElButton type="primary" :loading="saving" @click="save">Save</ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>
