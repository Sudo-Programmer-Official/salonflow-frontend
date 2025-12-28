<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElSwitch, ElAlert, ElButton } from 'element-plus';
import {
  fetchReminderSettings,
  updateReminderSettings,
  type ReminderSettings,
} from '../../api/appointmentReminders';

const settings = ref<ReminderSettings>({
  enabled: false,
  send24h: true,
  send2h: false,
});

const loading = ref(false);
const saving = ref(false);
const success = ref('');
const error = ref('');

const loadSettings = async () => {
  loading.value = true;
  try {
    settings.value = await fetchReminderSettings();
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
    const saved = await updateReminderSettings(settings.value);
    settings.value = saved;
    success.value = 'Reminder settings saved.';
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
      <h1 class="text-2xl font-semibold text-slate-900">Appointment SMS Reminders</h1>
      <p class="text-sm text-slate-600">
        Automatically send reminders before appointments. Consent and SMS rules apply.
      </p>
    </div>

    <ElCard class="bg-white space-y-4" :loading="loading">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">Enable reminders</div>
          <div class="text-xs text-slate-600">Sends to customers who have consented to SMS.</div>
        </div>
        <ElSwitch v-model="settings.enabled" size="large" />
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-slate-900">Send 24 hours before</div>
        <ElSwitch v-model="settings.send24h" :disabled="!settings.enabled" />
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-slate-900">Send 2 hours before</div>
        <ElSwitch v-model="settings.send2h" :disabled="!settings.enabled" />
      </div>

      <ElAlert
        title="Reminders are one-way only. No links, no rescheduling. One per appointment per timing."
        type="info"
        :closable="false"
        class="w-full"
      />

      <div class="flex justify-end">
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
