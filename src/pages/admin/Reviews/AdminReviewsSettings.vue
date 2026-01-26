<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElCard, ElForm, ElFormItem, ElSwitch, ElInput, ElButton, ElMessage } from 'element-plus';
import { fetchReviewSettings, updateReviewSettings, sendTestReviewSms, type ReviewSettings } from '../../../api/reviews';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const settings = ref<ReviewSettings | null>(null);
const smsTemplate = ref('');
const enabled = ref(true);
const testPhone = ref('');

const load = async () => {
  loading.value = true;
  try {
    const data = await fetchReviewSettings();
    settings.value = data;
    smsTemplate.value = data.sms_template || '';
    enabled.value = data.enabled;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to load settings');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const save = async () => {
  saving.value = true;
  try {
    const saved = await updateReviewSettings({
      enabled: enabled.value,
      smsTemplate: smsTemplate.value,
    });
    settings.value = saved;
    ElMessage.success('Saved');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Save failed');
  } finally {
    saving.value = false;
  }
};

const sendTest = async () => {
  if (!testPhone.value) {
    ElMessage.warning('Enter a phone number');
    return;
  }
  testing.value = true;
  try {
    await sendTestReviewSms(testPhone.value);
    ElMessage.success('Test SMS enqueued');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Test failed');
  } finally {
    testing.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="text-xs text-slate-500 flex items-center gap-2">
      <RouterLink class="hover:underline" :to="{ name: 'admin-website' }">Website</RouterLink>
      <span>/</span>
      <span>Reviews</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Reviews Settings</h1>
        <p class="text-sm text-slate-600">Control review request messaging and routing.</p>
      </div>
    </div>

    <ElCard shadow="never" class="border border-slate-200" :loading="loading">
      <ElForm label-position="top" class="space-y-4">
        <ElFormItem label="Enable review requests">
          <ElSwitch v-model="enabled" />
        </ElFormItem>
        <ElFormItem label="SMS template">
          <ElInput type="textarea" v-model="smsTemplate" :rows="4" placeholder="Thanks for visiting {{business}}! Please rate us: {{link}}" />
        </ElFormItem>
        <div class="flex gap-2">
          <ElButton type="primary" :loading="saving" @click="save">Save</ElButton>
          <div class="flex items-center gap-2">
            <ElInput v-model="testPhone" placeholder="Test phone (E.164)" style="width: 220px" />
            <ElButton :loading="testing" @click="sendTest">Send test SMS</ElButton>
          </div>
        </div>
      </ElForm>
    </ElCard>
  </div>
</template>
